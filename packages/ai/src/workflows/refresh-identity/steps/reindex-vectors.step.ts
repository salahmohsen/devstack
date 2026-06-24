import { createStep } from "@mastra/core/workflows";
import { sql } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@tsu-stack/db";
import { identityRepository } from "@tsu-stack/db/repositories";

import { ollamaEmbedder } from "#@/mastra/embeddings/ollama";

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

    // The `ai` SDK's `embedMany` is not a dependency of this package; the
    // Ollama embedder implements `EmbeddingModelV2` directly and exposes
    // `doEmbed({ values })` returning the same `EmbedManyResult` shape.
    const { embeddings } = await ollamaEmbedder.doEmbed({
      values: toReindex.map((f) => JSON.stringify(f.value))
    });

    for (let i = 0; i < toReindex.length; i += 1) {
      const facet = toReindex[i];
      const embedding = embeddings[i];
      if (!facet || !embedding) continue;
      // pgvector expects a stringified array '[1,2,3]'.
      const vecStr = `[${embedding.join(",")}]`;
      // The `identity_facet_vectors` table follows Mastra's PgVector schema
      // (vector_id, embedding, metadata) plus a version column — see plan #18.
      await db.execute(sql`
        INSERT INTO identity_facet_vectors (vector_id, version, embedding, metadata)
        VALUES (${facet.key}, ${facet.version}, ${vecStr}::vector, ${sql.raw(`'{"facetKey":"${facet.key}"}'::jsonb`)})
        ON CONFLICT (vector_id) DO UPDATE
          SET version = EXCLUDED.version,
              embedding = EXCLUDED.embedding,
              embedded_at = now(),
              metadata = EXCLUDED.metadata
      `);
    }

    return { reindexedKeys: toReindex.map((f) => f.key) };
  }
});
