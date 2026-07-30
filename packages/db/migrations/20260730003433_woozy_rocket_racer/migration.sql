CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
ALTER TABLE "ai_correction" ADD COLUMN "embedding_vec" vector(1536);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_correction_embedding_vec_hnsw_idx"
  ON "ai_correction"
  USING hnsw ("embedding_vec" vector_cosine_ops)
  WHERE "embedding_vec" IS NOT NULL;
