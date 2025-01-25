import { ScalaKnowledgeBase } from '../rag/config';

export async function handleScalaMessage(message: any, runtime: any) {
  try {
    const kb = await ScalaKnowledgeBase.getInstance();

    // Query relevant knowledge
    const relevantDocs = await kb.query(message.content);

    // Create context-aware prompt
    const context = relevantDocs.map(doc => doc.pageContent).join('\n');
    const prompt = `
      Context from Scala knowledge base:
      ${context}

      User message: ${message.content}

      Please provide a helpful response based on the context and your Scala knowledge.
    `;

    // Generate response
    const response = await runtime.generate(prompt);

    // Store the conversation
    await kb.addKnowledge(
      `Q: ${message.content}\nA: ${response}`,
      { type: 'conversation' }
    );

    return response;
  } catch (error) {
    console.error('Error in Scala handler:', error);
    return "I encountered an error processing your request.";
  }
}