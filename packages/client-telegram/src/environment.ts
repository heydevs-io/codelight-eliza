import { IAgentRuntime } from "@ai16z/eliza";
import { z } from "zod";

export const telegramEnvSchema = z.object({
    TELEGRAM_BOT_TOKEN: z.string().min(1, "Telegram bot token is required"),
    TELEGRAM_TARGET_GROUPS: z
        .string()
        .min(1, "At least one target group ID is required"),
    TELEGRAM_BOT_NAME: z.string().min(1, "Telegram bot name is required"),
    TELEGRAM_POST_INTERVAL_MIN: z.string().optional(),
    TELEGRAM_POST_INTERVAL_MAX: z.string().optional(),
    TELEGRAM_DRY_RUN: z.string().optional(),
    TELEGRAM_POST_IMMEDIATELY: z.string().optional(),
});

export type TelegramConfig = z.infer<typeof telegramEnvSchema>;

export async function validateTelegramConfig(
    runtime: IAgentRuntime
): Promise<TelegramConfig> {
    try {
        const config = {
            TELEGRAM_BOT_TOKEN:
                runtime.getSetting("TELEGRAM_BOT_TOKEN") ||
                process.env.TELEGRAM_BOT_TOKEN,
            TELEGRAM_TARGET_GROUPS:
                runtime.getSetting("TELEGRAM_TARGET_GROUPS") ||
                process.env.TELEGRAM_TARGET_GROUPS,
            TELEGRAM_BOT_NAME:
                runtime.getSetting("TELEGRAM_BOT_NAME") ||
                process.env.TELEGRAM_BOT_NAME,
            TELEGRAM_POST_INTERVAL_MIN:
                runtime.getSetting("TELEGRAM_POST_INTERVAL_MIN") ||
                process.env.TELEGRAM_POST_INTERVAL_MIN,
            TELEGRAM_POST_INTERVAL_MAX:
                runtime.getSetting("TELEGRAM_POST_INTERVAL_MAX") ||
                process.env.TELEGRAM_POST_INTERVAL_MAX,
            TELEGRAM_DRY_RUN:
                runtime.getSetting("TELEGRAM_DRY_RUN") ||
                process.env.TELEGRAM_DRY_RUN,
            TELEGRAM_POST_IMMEDIATELY:
                runtime.getSetting("TELEGRAM_POST_IMMEDIATELY") ||
                process.env.TELEGRAM_POST_IMMEDIATELY,
        };

        return telegramEnvSchema.parse(config);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessages = error.errors
                .map((err) => `${err.path.join(".")}: ${err.message}`)
                .join("\n");
            throw new Error(
                `Telegram configuration validation failed:\n${errorMessages}`
            );
        }
        throw error;
    }
}
