import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { v4 } from "uuid";

import {
    AgentRuntime,
    ContentStatus,
    elizaLogger,
    UUID,
    validateCharacterConfig,
} from "@ai16z/eliza";

import { REST, Routes } from "discord.js";

export function createApiRouter(
    agents: Map<string, AgentRuntime>,
    directClient
) {
    const router = express.Router();

    router.use(cors());
    router.use(bodyParser.json());
    router.use(bodyParser.urlencoded({ extended: true }));

    router.get("/", (req, res) => {
        res.send("Welcome, this is the REST API!");
    });

    router.get("/hello", (req, res) => {
        res.json({ message: "Hello World!" });
    });

    router.get("/agents", (req, res) => {
        const agentsList = Array.from(agents.values()).map((agent) => ({
            id: agent.agentId,
            name: agent.character.name,
            clients: Object.keys(agent.clients),
        }));
        res.json({ agents: agentsList });
    });

    router.get("/agents/:agentId", (req, res) => {
        const agentId = req.params.agentId;
        const agent = agents.get(agentId);

        if (!agent) {
            res.status(404).json({ error: "Agent not found" });
            return;
        }

        res.json({
            id: agent.agentId,
            character: agent.character,
        });
    });

    router.post("/agents/:agentId/set", async (req, res) => {
        const agentId = req.params.agentId;
        console.log('agentId', agentId)
        let agent:AgentRuntime = agents.get(agentId);

        // update character
        if (agent) {
            // stop agent
            agent.stop()
            directClient.unregisterAgent(agent)
            // if it has a different name, the agentId will change
        }

        // load character from body
        const character = req.body
        try {
          validateCharacterConfig(character)
        } catch(e) {
          elizaLogger.error(`Error parsing character: ${e}`);
          res.status(400).json({
            success: false,
            message: e.message,
          });
          return;
        }

        // start it up (and register it)
        agent = await directClient.startAgent(character)
        elizaLogger.log(`${character.name} started`)

        res.json({
            id: character.id,
            character: character,
        });
    });


    router.get("/agents/:agentId/channels", async (req, res) => {
        const agentId = req.params.agentId;
        const runtime = agents.get(agentId);

        if (!runtime) {
            res.status(404).json({ error: "Runtime not found" });
            return;
        }

        const API_TOKEN = runtime.getSetting("DISCORD_API_TOKEN") as string;
        const rest = new REST({ version: "10" }).setToken(API_TOKEN);

        try {
            const guilds = (await rest.get(Routes.userGuilds())) as Array<any>;

            res.json({
                id: runtime.agentId,
                guilds: guilds,
                serverCount: guilds.length,
            });
        } catch (error) {
            console.error("Error fetching guilds:", error);
            res.status(500).json({ error: "Failed to fetch guilds" });
        }
    });

    router.get("/v1/agents", async (req, res) => {
        const agent = agents.values().next().value as AgentRuntime;
        const agentList = await agent.databaseAdapter.getAgentList();

        if (!agentList) {
            res.status(404).json({ error: "Agent not found" });
            return;
        }

        res.json({
            success: true,
            data: agentList,
        });
    });

    router.get("/v1/agents/:agentId", async (req, res) => {
        const agentId = req.params.agentId;
        const agent = agents.values().next().value as AgentRuntime;

        const agentInfo = await agent.databaseAdapter.getAccountById(
            agentId as UUID
        );

        if (!agent) {
            res.status(404).json({ error: "Agent not found" });
            return;
        }

        res.json({
            success: true,
            data: agentInfo,
        });
    });

    router.post("/v1/content-store", async (req, res) => {
        const {
            agentId,
            source,
            sourceUrl,
            content,
            priority,
            action,
            targetPlatform,
        } = req.body;

        // Validate required fields
        if (!agentId || !source || !action) {
            return res.status(400).json({
                success: false,
                message:
                    "Missing required fields: agentId, source, and action are required",
            });
        }

        // Validate targetPlatform
        if (targetPlatform !== "twitter") {
            return res.status(400).json({
                success: false,
                message: "targetPlatform must be 'twitter'",
            });
        }

        // Validate action
        if (action !== "twitter_post") {
            return res.status(400).json({
                success: false,
                message: "action must be 'twitter_post'",
            });
        }

        // Validate source
        if (source !== "url" && source !== "text") {
            return res.status(400).json({
                success: false,
                message: "source must be either 'url' or 'text'",
            });
        }

        const agent = agents.get(agentId);
        if (!agent) {
            return res.status(404).json({
                success: false,
                message: "Agent not found",
            });
        }

        try {
            // Create content store item
            const contentItem = {
                id: v4() as UUID,
                userId: agent.agentId,
                agentId,
                source,
                sourceUrl,
                content,
                metadata: {},
                priority: priority || 0,
                status: ContentStatus.PENDING,
                action,
                targetPlatform,
            };

            // Store using database adapter
            const success =
                await agent.databaseAdapter.createContentStore(contentItem);

            if (!success) {
                return res.status(500).json({
                    success: false,
                    message: "Failed to store content",
                });
            }

            return res.status(200).json({
                success: true,
                message: "Content stored successfully",
                data: contentItem,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to store content",
                error: error.message,
            });
        }
    });

    router.get("/v1/agents/:agentId/interaction-targets", async (req, res) => {
        // Get first agent
        const agent = agents.values().next().value as AgentRuntime;
        const agentId = req.params.agentId;
        const platform = req.query.platform as string;
        // TODO (lau, Codelight): this code is always getting the first agent so we need to fix it later
        if (!agent) {
            res.status(404).json({ error: "Agent not found" });
            return;
        }

        // Validate platform
        // TODO (lau, Codelight): add other platforms
        if (!["twitter", "codelight_twitter"].includes(platform)) {
            return res.status(400).json({
                success: false,
                message: "Platform must be one of: twitter, codelight_twitter",
            });
        }

        try {
            const interactionTargetEntity =
                await agent.databaseAdapter.getAgentInteractionTargetByAgentId({
                    agentId: agentId as UUID,
                    platform: platform as "twitter",
                });

            if (!interactionTargetEntity) {
                return res.status(404).json({
                    success: false,
                    message: "Interaction target not found",
                });
            }

            res.json({
                success: true,
                data: interactionTargetEntity,
            });
        } catch (error) {
            elizaLogger.error("Error fetching interaction targets:", error);
            res.status(500).json({
                success: false,
                error: "Failed to fetch interaction targets",
            });
        }
    });

    router.post("/v1/agents/:agentId/interaction-targets", async (req, res) => {
        // Get first agent
        const agent = agents.values().next().value as AgentRuntime;
        const agentId = req.params.agentId;
        const { targetUsernames, platform } = req.body;

        // TODO (lau, Codelight): this code is always getting the first agent so we need to fix it later
        if (!agent) {
            res.status(404).json({ error: "Agent not found" });
            return;
        }

        // Validate platform
        // TODO (lau, Codelight): add other platforms
        if (!["twitter", "codelight_twitter"].includes(platform)) {
            return res.status(400).json({
                success: false,
                message: "Platform must be one of: twitter, codelight_twitter",
            });
        }

        // Validate targetUsernames
        if (
            !targetUsernames ||
            !Array.isArray(targetUsernames) ||
            !targetUsernames.every((username) => typeof username === "string")
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "targetUsernames is required and must be an array of strings",
            });
        }

        try {
            // Check if target already exists for this platform
            const existingTarget =
                await agent.databaseAdapter.getAgentInteractionTargetByAgentId({
                    agentId: agentId as UUID,
                    platform,
                });

            let success: boolean;
            if (existingTarget) {
                // Update existing target
                success =
                    await agent.databaseAdapter.updateAgentInteractionTarget({
                        agentId: agentId as UUID,
                        targetUsernames: targetUsernames.join(","),
                        platform,
                    });
            } else {
                // Create new target
                success =
                    await agent.databaseAdapter.createAgentInteractionTarget({
                        agentId: agentId as UUID,
                        targetUsernames: targetUsernames.join(","),
                        platform,
                    });
            }

            if (success) {
                res.json({
                    success: true,
                    message: `${existingTarget ? "Updated" : "Created"} interaction target successfully`,
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: `Failed to ${existingTarget ? "update" : "create"} interaction target`,
                });
            }
        } catch (error) {
            elizaLogger.error("Error managing interaction target:", error);
            res.status(500).json({
                success: false,
                error: "Failed to manage interaction target",
            });
        }
    });

    return router;
}
