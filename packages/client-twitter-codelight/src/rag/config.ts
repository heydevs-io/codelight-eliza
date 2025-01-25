import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';

export class ScalaKnowledgeBase {
  private static instance: ScalaKnowledgeBase;
  private vectorStore: PineconeStore;

  private constructor() {}

  public static async getInstance(): Promise<ScalaKnowledgeBase> {
    if (!this.instance) {
      this.instance = new ScalaKnowledgeBase();
      await this.instance.initialize();
    }
    return this.instance;
  }

  private async initialize() {
    const client = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
      environment: process.env.PINECONE_ENVIRONMENT!
    });

    const index = client.Index(process.env.PINECONE_INDEX!);
    this.vectorStore = await PineconeStore.fromExistingIndex(
      new OpenAIEmbeddings(),
      { pineconeIndex: index }
    );
  }

  async query(question: string, k = 3) {
    return await this.vectorStore.similaritySearch(question, k);
  }

  async addKnowledge(content: string, metadata = {}) {
    await this.vectorStore.addDocuments([{
      pageContent: content,
      metadata: { ...metadata, timestamp: new Date().toISOString() }
    }]);
  }
}