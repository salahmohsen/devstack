import { Memory } from "@mastra/memory";

import { IDENTITY_WORKING_MEMORY_TEMPLATE } from "@tsu-stack/core/identity";

import { ollamaEmbedder } from "#@/mastra/embeddings/ollama";
import { createMastraD1Store, createMastraVectorStore, type D1Database } from "#@/memory/storage";

export type { D1Database } from "#@/memory/storage";

export function createMastraMemory(binding: D1Database): Memory {
  return new Memory({
    storage: createMastraD1Store(binding),
    vector: createMastraVectorStore(),
    embedder: ollamaEmbedder,
    options: {
      lastMessages: 20,
      // semanticRecall is disabled because the chosen embedding model
      // (Ollama `qwen3-embedding`, 4096-d) is above pgvector's 2000-d
      // cap on HNSW and IVFFlat indexes. Re-enable when the embedding
      // model is switched to a <= 2000-d model OR when the vector
      // store is moved to one that supports 4096-d indexes
      // (e.g. Qdrant, ClickHouse). See plans/2026-06-22-mastra-ai-test.md #23.
      semanticRecall: false,
      workingMemory: {
        enabled: true,
        scope: "resource",
        template: IDENTITY_WORKING_MEMORY_TEMPLATE
      }
    }
  });
}
