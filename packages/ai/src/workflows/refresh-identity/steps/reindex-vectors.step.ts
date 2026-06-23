import { ModelRouterEmbeddingModel } from "@mastra/core/llm";
import { createStep } from "@mastra/core/workflows";
import { sql } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@tsu-stack/db";
import { identityRepository } from "@tsu-stack/db/repositories";
import { ENV_SERVER } from "@tsu-stack/env/server/env";

export const reindexVectorsStep = createStep({
  id: "reindex-vectors",
  inputSchema: z.object({
    applied: z.array(z.string()),
    queued: z.array(z.string())
  }),
  outputSchema: z.object({
    reindexedKeys: z.array(z.string())
  }),
  execute: async ({ inputData }) => {
    if (inputData.applied.length === 0) {
      return { reindexedKeys: [] };
    }

    const db = getDb();
    const facets = await identityRepository.listFacets();
    const changedKeys = new Set(inputData.applied);
    const toReindex = facets.filter((f) => changedKeys.has(f.key));

    if (toReindex.length === 0) {
      return { reindexedKeys: [] };
    }

    const model = new ModelRouterEmbeddingModel(
      ENV_SERVER.EMBEDDING_MODEL ?? "openai/text-embedding-3-small"
    );

    // The `ai` SDK's `embedMany` is not a dependency of this package; the
    // Mastra-provided `ModelRouterEmbeddingModel` implements
    // `EmbeddingModelV2` directly and exposes a `doEmbed({ values })` method
    // that returns the same `EmbedManyResult` shape.
    const { embeddings } = await model.doEmbed({
      values: toReindex.map((f) => JSON.stringify(f.value))
    });

    for (let i = 0; i < toReindex.length; i += 1) {
      const facet = toReindex[i];
      const embedding = embeddings[i];
      if (!facet || !embedding) continue;
      // pgvector expects a stringified array '[1,2,3]'.
      const vecStr = `[${embedding.join(",")}]`;
      await db.execute(sql`
        INSERT INTO identity_facet_vectors (facet_key, version, embedding)
        VALUES (${facet.key}, ${facet.version}, ${vecStr}::vector)
        ON CONFLICT (facet_key) DO UPDATE
          SET version = EXCLUDED.version,
              embedding = EXCLUDED.embedding,
              embedded_at = now()
      `);
    }

    return { reindexedKeys: toReindex.map((f) => f.key) };
  }
});
