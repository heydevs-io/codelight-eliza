import { CodelightTwitterPostClient } from "./post.ts";
import { CodelightTwitterSearchClient } from "./search.ts";
import { CodelightTwitterInteractionClient } from "./interactions.ts";
import { IAgentRuntime, Client, elizaLogger } from "@ai16z/eliza";
import { validateTwitterConfig } from "./environment.ts";
import { ClientBase } from "./base.ts";
import { callDifyAI } from "./bot_rag.ts";
// import { handleScalaMessage } from './actions/scalaHandler';
import { Tweet } from "agent-twitter-client";
class TwitterManager {
    client: ClientBase;
    post: CodelightTwitterPostClient;
    search: CodelightTwitterSearchClient;
    interaction: CodelightTwitterInteractionClient;
    constructor(runtime: IAgentRuntime) {
        this.client = new ClientBase(runtime);
        this.post = new CodelightTwitterPostClient(this.client, runtime);
        this.interaction = new CodelightTwitterInteractionClient(
            this.client,
            runtime
        );
    }
}

export const CodelightTwitterClientInterface: Client = {
    async start(runtime: IAgentRuntime) {
        await validateTwitterConfig(runtime);

        elizaLogger.log("Twitter client started");
        console.log("runtime", runtime);
        const manager = new TwitterManager(runtime);

        await manager.client.init();
        //const response = await callDifyAI("Hello");
        //console.log("response:", response);
        console.log("character name", runtime.character.name);
        if (runtime.character.name === "Scala AI Agent") {
            console.log("character name", runtime.character.name);
            try {
                // Lắng nghe và trả lời comments
                await manager.interaction.startV2();
            } catch (error) {
                console.error('Error starting Scala bot:', error);
            }
        } else {
            //await manager.post.start();
        }
        await manager.post.start();
        return manager;
    },
    async stop(_runtime: IAgentRuntime) {
        elizaLogger.warn("Twitter client does not support stopping yet");
    },
};

export default CodelightTwitterClientInterface;
