-- Add is_present columns for experience and project (idempotent)
ALTER TABLE "experience" ADD COLUMN IF NOT EXISTS "is_present" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "is_present" boolean DEFAULT false;--> statement-breakpoint

-- Create new stack table for first-class tech stacks (idempotent)
CREATE TABLE IF NOT EXISTS "stack" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"icon" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "stack_name_unique_idx" ON "stack" ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stack_sort_order_idx" ON "stack" ("sort_order");--> statement-breakpoint

-- Deduplicate existing project_stack entries by name and seed the stack table.
-- The first project_stack row per name is reused as the source of its icon,
-- and the first project's stack id is preserved as the new stack id.
-- ON CONFLICT (name) DO NOTHING keeps this safe on re-runs after the unique
-- index is in place.
WITH "seed" AS (
	SELECT DISTINCT ON ("name") "id", "name", "icon_url"
	FROM "project_stack"
	ORDER BY "name", "id"
)
INSERT INTO "stack" ("id", "name", "icon", "sort_order", "created_at", "updated_at")
SELECT "id", "name", "icon_url", 0, now(), now()
FROM "seed"
ON CONFLICT ("name") DO NOTHING;--> statement-breakpoint

-- Add stack_id column to project_stack (nullable initially so we can backfill)
ALTER TABLE "project_stack" ADD COLUMN IF NOT EXISTS "stack_id" text;--> statement-breakpoint

-- Populate stack_id by matching project_stack.name to stack.name.
-- Skip rows that already have a stack_id so re-runs do not stomp existing data.
UPDATE "project_stack" ps
SET "stack_id" = s."id"
FROM "stack" s
WHERE s."name" = ps."name" AND ps."stack_id" IS NULL;--> statement-breakpoint

-- Drop the old inline stack columns now that data lives in the stack table
ALTER TABLE "project_stack" DROP COLUMN IF EXISTS "name";--> statement-breakpoint
ALTER TABLE "project_stack" DROP COLUMN IF EXISTS "icon_url";--> statement-breakpoint

-- Promote stack_id to NOT NULL once every row has been backfilled
ALTER TABLE "project_stack" ALTER COLUMN "stack_id" SET NOT NULL;--> statement-breakpoint

-- Add foreign key, unique constraint, and supporting index for the new join column
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'project_stack_stack_id_stack_id_fkey'
	) THEN
		ALTER TABLE "project_stack"
			ADD CONSTRAINT "project_stack_stack_id_stack_id_fkey"
			FOREIGN KEY ("stack_id") REFERENCES "stack"("id") ON DELETE CASCADE;
	END IF;
END
$$;--> statement-breakpoint

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'project_stack_project_id_stack_id_unique'
	) THEN
		ALTER TABLE "project_stack"
			ADD CONSTRAINT "project_stack_project_id_stack_id_unique"
			UNIQUE ("project_id", "stack_id");
	END IF;
END
$$;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "project_stack_stack_id_idx" ON "project_stack" ("stack_id");
