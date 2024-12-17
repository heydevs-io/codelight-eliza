import { CodelightTwitterPostClient } from "./post.ts";
import { CodelightTwitterSearchClient } from "./search.ts";
import { CodelightTwitterInteractionClient } from "./interactions.ts";
import { IAgentRuntime, Client, elizaLogger } from "@ai16z/eliza";
import { validateTwitterConfig } from "./environment.ts";
import { ClientBase } from "./base.ts";

class TwitterManager {
    client: ClientBase;
    post: CodelightTwitterPostClient;
    search: CodelightTwitterSearchClient;
    interaction: CodelightTwitterInteractionClient;
    constructor(runtime: IAgentRuntime) {
        this.client = new ClientBase(runtime);
        // TODO: Codelight - re-check if we need this
        // this.post = new TwitterPostClient(this.client, runtime);
        // this.search = new TwitterSearchClient(this.client, runtime); // don't start the search client by default
        // this searches topics from character file, but kind of violates consent of random users
        // burns your rate limit and can get your account banned
        // use at your own risk
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

        const manager = new TwitterManager(runtime);

        await manager.client.init();

        // await manager.post.start();

        await manager.interaction.startV2();

        // await manager.search.start(); // don't run the search by default

        return manager;
    },
    async stop(_runtime: IAgentRuntime) {
        elizaLogger.warn("Twitter client does not support stopping yet");
    },
};

export default CodelightTwitterClientInterface;
