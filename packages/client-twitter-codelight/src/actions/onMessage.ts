import { ScalaKnowledgeBase } from '../rag/config';

export async function onMessage(message: any, runtime: any) {
  const kb = await ScalaKnowledgeBase.getInstance();

  // Truy vấn kiến thức liên quan
  const relevantDocs = await kb.query(message.content);

  // Tạo prompt với context
  const prompt = `
    Context from Scala knowledge base:
    ${relevantDocs.map(doc => doc.pageContent).join('\n')}

    User question: ${message.content}

    Please provide a helpful response based on the context and your knowledge.
  `;

  // Generate response
  const response = await runtime.generate(prompt);

  // Lưu conversation vào knowledge base
  await kb.addKnowledge(
    `Q: ${message.content}\nA: ${response}`,
    { type: 'conversation' }
  );

  return response;
}