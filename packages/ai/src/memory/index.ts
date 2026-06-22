import { Memory } from "@mastra/memory";

import { IDENTITY_WORKING_MEMORY_TEMPLATE } from "@tsu-stack/core/identity";
import { ENV_SERVER } from "@tsu-stack/env/server/env";

import { createMastraD1Store, createMastraVectorStore, type D1Database } from "#@/memory/storage";

export type { D1Database } from "#@/memory/storage";

export function createMastraMemory(binding: D1Database): Memory {
  return new Memory({
    storage: createMastraD1Store(binding),
    vector: createMastraVectorStore(),
    embedder: ENV_SERVER.EMBEDDING_MODEL ?? "openai/text-embedding-3-small",
    options: {
      lastMessages: 20,
      semanticRecall: { topK: 3, messageRange: { before: 2, after: 1 } },
      workingMemory: {
        enabled: true,
        scope: "resource",
        template: IDENTITY_WORKING_MEMORY_TEMPLATE
      }
    }
  });
}
