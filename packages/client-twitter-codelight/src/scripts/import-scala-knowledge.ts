import { ScalaKnowledgeBase } from '../rag/config';

const scalaKnowledge = [
  {
    content: "Scala is a general-purpose programming language that combines object-oriented and functional programming.",
    metadata: { type: 'concept' }
  },
  {
    content: "Pattern matching is a key feature in Scala that lets you match on different types of data.",
    metadata: { type: 'feature' }
  },
  // Thêm nhiều kiến thức Scala khác...
];

async function importKnowledge() {
  const kb = await ScalaKnowledgeBase.getInstance();

  for (const item of scalaKnowledge) {
    await kb.addKnowledge(item.content, item.metadata);
    console.log(`Imported: ${item.content.substring(0, 50)}...`);
  }
}

importKnowledge();