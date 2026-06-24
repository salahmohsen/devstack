import { createVectorQueryTool } from "@mastra/rag";

import { ollamaEmbedder } from "#@/mastra/embeddings/ollama";

export const searchIdentityTool = createVectorQueryTool({
  id: "search-identity",
  description:
    "Semantic search over identity facet vectors. Use this when the user asks about themes, past work, or anything that requires fuzzy matching against their identity.",
  vectorStoreName: "mastra-vectors",
  indexName: "identity_facet_vectors",
  model: ollamaEmbedder,
  databaseConfig: {
    pgvector: {
      minScore: 0.65
    }
  }
});
