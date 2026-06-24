CREATE TYPE "portfolio_identity_source" AS ENUM('github', 'manual', 'conversation', 'seed');--> statement-breakpoint
CREATE TABLE "portfolio_identity_facets" (
	"key" text PRIMARY KEY,
	"value" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"source" "portfolio_identity_source" NOT NULL,
	"source_ref" text,
	"reason" text NOT NULL,
	"updated_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_identity_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facet_key" text NOT NULL,
	"proposed_value" jsonb NOT NULL,
	"current_value" jsonb NOT NULL,
	"confidence" real NOT NULL,
	"reason" text NOT NULL,
	"source" "portfolio_identity_source" NOT NULL,
	"source_ref" text,
	"status" text DEFAULT 'open' NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_identity_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"facet_key" text NOT NULL,
	"version" integer NOT NULL,
	"value" jsonb NOT NULL,
	"source" "portfolio_identity_source" NOT NULL,
	"source_ref" text,
	"reason" text NOT NULL,
	"actor" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "identity_proposals_status_idx" ON "portfolio_identity_proposals" ("status","created_at");--> statement-breakpoint
CREATE INDEX "identity_proposals_facet_idx" ON "portfolio_identity_proposals" ("facet_key");--> statement-breakpoint
CREATE INDEX "identity_revisions_facet_idx" ON "portfolio_identity_revisions" ("facet_key","version");--> statement-breakpoint
CREATE INDEX "identity_revisions_created_idx" ON "portfolio_identity_revisions" ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "identity_revisions_source_ref_unique_idx" ON "portfolio_identity_revisions" ("facet_key","source","source_ref") WHERE "source_ref" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "portfolio_identity_proposals" ADD CONSTRAINT "portfolio_identity_proposals_n0vG197b3IIM_fkey" FOREIGN KEY ("facet_key") REFERENCES "portfolio_identity_facets"("key") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "portfolio_identity_revisions" ADD CONSTRAINT "portfolio_identity_revisions_vWRPOaetMxvJ_fkey" FOREIGN KEY ("facet_key") REFERENCES "portfolio_identity_facets"("key") ON DELETE CASCADE;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TABLE "identity_facet_vectors" (
	"facet_key" text PRIMARY KEY REFERENCES "portfolio_identity_facets"("key") ON DELETE CASCADE,
	"version" integer NOT NULL,
	"embedding" vector(4096) NOT NULL,
	"embedded_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
-- No index: pgvector's HNSW and IVFFlat cap at 2000 dimensions; the chosen Ollama
-- qwen3-embedding model emits 4096-d vectors. With only a handful of facet rows,
-- exact (sequential) search is fast enough.
CREATE INDEX "identity_facet_vectors_no_op" ON "identity_facet_vectors" ("facet_key");