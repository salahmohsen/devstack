import { ModelRouterEmbeddingModel } from "@mastra/core/llm";
import { createVectorQueryTool } from "@mastra/rag";

import { ENV_SERVER } from "@tsu-stack/env/server/env";

export const searchIdentityTool = createVectorQueryTool({
  id: "search-identity",
  description:
    "Semantic search over identity facet vectors. Use this when the user asks about themes, past work, or anything that requires fuzzy matching against their identity.",
  vectorStoreName: "mastra-vectors",
  indexName: "identity_facet_vectors",
  model: new ModelRouterEmbeddingModel(ENV_SERVER.EMBEDDING_MODEL),
  databaseConfig: {
    pgvector: {
      minScore: 0.65
    }
  }
});
