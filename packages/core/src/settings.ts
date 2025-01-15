import { config } from "dotenv";
import fs from "fs";
import path from "path";
import elizaLogger from "./logger.ts";

// Add environment type constant
const NODE_ENV = process.env.NODE_ENV || "development";

/**
 * Gets the appropriate environment file name based on NODE_ENV
 * @returns {string} Environment file name (e.g., .env.dev for development)
 */
const getEnvFileName = (): string => {
    switch (NODE_ENV) {
        case "decentral-charm":
            return "./codelight-production/.env.decentral-charm";
        case "brian":
            return "./codelight-production/.env.brian";
        case "doge":
            return "./codelight-production/.env.doge";
        case "mew":
            return "./codelight-production/.env.mew";
        case "test":
            return "./codelight-production/.env.test";
        default:
            return ".env";
    }
};

elizaLogger.info("Loading embedding settings:", {
    USE_OPENAI_EMBEDDING: process.env.USE_OPENAI_EMBEDDING,
    USE_OLLAMA_EMBEDDING: process.env.USE_OLLAMA_EMBEDDING,
    OLLAMA_EMBEDDING_MODEL:
        process.env.OLLAMA_EMBEDDING_MODEL || "mxbai-embed-large",
});

// Add this logging block
elizaLogger.info("Loading character settings:", {
    CHARACTER_PATH: process.env.CHARACTER_PATH,
    ARGV: process.argv,
    CHARACTER_ARG: process.argv.find((arg) => arg.startsWith("--character=")),
    CWD: process.cwd(),
});

interface Settings {
    [key: string]: string | undefined;
}

let environmentSettings: Settings = {};

/**
 * Determines if code is running in a browser environment
 * @returns {boolean} True if in browser environment
 */
const isBrowser = (): boolean => {
    return (
        typeof window !== "undefined" && typeof window.document !== "undefined"
    );
};

/**
 * Recursively searches for environment files starting from the current directory
 * @param {string} [startDir=process.cwd()] - Starting directory for the search
 * @returns {string|null} Path to the nearest env file or null if not found
 */
export function findNearestEnvFile(startDir = process.cwd()) {
    if (isBrowser()) return null;

    let currentDir = startDir;
    const envFileName = getEnvFileName();

    // Continue searching until we reach the root directory
    while (currentDir !== path.parse(currentDir).root) {
        const envPath = path.join(currentDir, envFileName);
        const defaultEnvPath = path.join(currentDir, ".env");

        // Check for specific environment file first, then fallback to default .env
        if (fs.existsSync(envPath)) {
            return envPath;
        } else if (fs.existsSync(defaultEnvPath)) {
            return defaultEnvPath;
        }

        // Move up to parent directory
        currentDir = path.dirname(currentDir);
    }

    // Check root directory as well
    const rootEnvPath = path.join(path.parse(currentDir).root, envFileName);
    const rootDefaultEnvPath = path.join(path.parse(currentDir).root, ".env");

    if (fs.existsSync(rootEnvPath)) {
        return rootEnvPath;
    } else if (fs.existsSync(rootDefaultEnvPath)) {
        return rootDefaultEnvPath;
    }

    return null;
}

/**
 * Configures environment settings for browser usage
 * @param {Settings} settings - Object containing environment variables
 */
export function configureSettings(settings: Settings) {
    environmentSettings = { ...settings };
}

/**
 * Loads environment variables from the nearest .env file in Node.js
 * or returns configured settings in browser
 * @returns {Settings} Environment variables object
 * @throws {Error} If no .env file is found in Node.js environment
 */
export function loadEnvConfig(): Settings {
    // For browser environments, return the configured settings
    if (isBrowser()) {
        return environmentSettings;
    }

    // Node.js environment: load from .env file
    const envPath = findNearestEnvFile();

    // attempt to Load the .env file into process.env
    const result = config(envPath ? { path: envPath } : {});

    if (!result.error) {
        console.log(`Loaded .env file from: ${envPath}`);
    }
    return process.env as Settings;
}

/**
 * Gets a specific environment variable
 * @param {string} key - The environment variable key
 * @param {string} [defaultValue] - Optional default value if key doesn't exist
 * @returns {string|undefined} The environment variable value or default value
 */
export function getEnvVariable(
    key: string,
    defaultValue?: string
): string | undefined {
    if (isBrowser()) {
        return environmentSettings[key] || defaultValue;
    }
    return process.env[key] || defaultValue;
}

/**
 * Checks if a specific environment variable exists
 * @param {string} key - The environment variable key
 * @returns {boolean} True if the environment variable exists
 */
export function hasEnvVariable(key: string): boolean {
    if (isBrowser()) {
        return key in environmentSettings;
    }
    return key in process.env;
}

// Initialize settings based on environment
export const settings = isBrowser() ? environmentSettings : loadEnvConfig();

elizaLogger.info("Parsed settings:", {
    USE_OPENAI_EMBEDDING: settings.USE_OPENAI_EMBEDDING,
    USE_OPENAI_EMBEDDING_TYPE: typeof settings.USE_OPENAI_EMBEDDING,
    USE_OLLAMA_EMBEDDING: settings.USE_OLLAMA_EMBEDDING,
    USE_OLLAMA_EMBEDDING_TYPE: typeof settings.USE_OLLAMA_EMBEDDING,
    OLLAMA_EMBEDDING_MODEL:
        settings.OLLAMA_EMBEDDING_MODEL || "mxbai-embed-large",
});

export default settings;
