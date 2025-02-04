import {
    composeContext,
    generateText,
    IAgentRuntime,
    ModelClass,
    stringToUuid,
    elizaLogger,
    parseBooleanFromText,
} from "@ai16z/eliza";
import { Context, Telegraf } from "telegraf";

const telegramPostTemplate = `
# Areas of Expertise
{{knowledge}}

# About {{agentName}}:
{{bio}}
{{lore}}
{{topics}}

{{providers}}

{{characterPostExamples}}

{{postDirections}}

# Task: Generate a post in the voice and style of {{agentName}}.
Write a 1-3 sentence post that is {{adjective}} about {{topic}} (without mentioning {{topic}} directly). Do not add commentary or acknowledge this request, just write the post.
Your response should not contain any questions. Brief, concise statements only. No emojis.`;

export class TelegramPostManager {
    private timeout: NodeJS.Timeout | undefined;
    constructor(
        public bot: Telegraf<Context>,
        public runtime: IAgentRuntime
    ) {
        this.bot = bot;
        this.runtime = runtime;
    }

    public async start(postImmediately: boolean = false) {
        const generateNewPostLoop = async () => {
            const lastPost = await this.runtime.cacheManager.get<{
                timestamp: number;
            }>(
                "telegram/" +
                    this.runtime.getSetting("TELEGRAM_BOT_NAME") +
                    "/lastPost"
            );

            const lastPostTimestamp = lastPost?.timestamp ?? 0;
            const minMinutes =
                parseInt(
                    this.runtime.getSetting("TELEGRAM_POST_INTERVAL_MIN")
                ) || 90;
            const maxMinutes =
                parseInt(
                    this.runtime.getSetting("TELEGRAM_POST_INTERVAL_MAX")
                ) || 180;
            const randomMinutes =
                Math.floor(Math.random() * (maxMinutes - minMinutes + 1)) +
                minMinutes;
            const delay = randomMinutes * 60 * 1000;

            if (Date.now() > lastPostTimestamp + delay) {
                await this.generateNewPost();
            }

            this.timeout = setTimeout(() => {
                generateNewPostLoop();
            }, delay);

            elizaLogger.log(`Next post scheduled in ${randomMinutes} minutes`);
        };

        if (
            this.runtime.getSetting("TELEGRAM_POST_IMMEDIATELY") != null &&
            this.runtime.getSetting("TELEGRAM_POST_IMMEDIATELY") != ""
        ) {
            postImmediately = parseBooleanFromText(
                this.runtime.getSetting("TELEGRAM_POST_IMMEDIATELY")
            );
        }
        if (postImmediately) {
            elizaLogger.log("Codelight: generating new post immediately");
            await this.generateNewPost();
        }

        generateNewPostLoop();
    }

    public async stop() {
        if (this.timeout) clearTimeout(this.timeout);
    }

    private async generateNewPost() {
        elizaLogger.log("Generating new Telegram post");

        try {
            const targetGroups =
                this.runtime.getSetting("TELEGRAM_TARGET_GROUPS")?.split(",") ||
                [];

            if (targetGroups.length === 0) {
                elizaLogger.error("No target groups configured for posting");
                return;
            }

            const roomId = stringToUuid("telegram_generate_room");

            const state = await this.runtime.composeState({
                roomId: roomId,
                userId: this.runtime.agentId,
                agentId: this.runtime.agentId,
                content: { text: "", action: "" },
            });

            const context = composeContext({
                state,
                template:
                    // this.runtime.character.templates?.telegramPostTemplate ||
                    telegramPostTemplate,
            });

            const content = await generateText({
                runtime: this.runtime,
                context,
                modelClass: ModelClass.SMALL,
            });

            if (this.runtime.getSetting("TELEGRAM_DRY_RUN") === "true") {
                elizaLogger.info(`Dry run: would have posted: ${content}`);
                return;
            }

            for (const groupId of targetGroups) {
                try {
                    const message = await this.bot.telegram.sendMessage(
                        groupId,
                        content
                    );

                    await this.runtime.cacheManager.set(
                        `telegram/${this.runtime.getSetting("TELEGRAM_BOT_NAME")}/lastPost`,
                        {
                            id: message.message_id,
                            timestamp: Date.now(),
                        }
                    );

                    elizaLogger.info(`Posted to group ${groupId}: ${content}`);

                    // Create memory for the post
                    await this.runtime.messageManager.createMemory({
                        id: stringToUuid(
                            message.message_id.toString() +
                                "-" +
                                this.runtime.agentId
                        ),
                        userId: this.runtime.agentId,
                        agentId: this.runtime.agentId,
                        roomId,
                        content: {
                            text: content,
                            source: "telegram",
                        },
                        createdAt: message.date * 1000,
                    });
                } catch (error) {
                    elizaLogger.error(
                        `Error posting to group ${groupId}:`,
                        error
                    );
                }
            }
        } catch (error) {
            elizaLogger.error("Error generating new post:", error);
        }
    }
}
