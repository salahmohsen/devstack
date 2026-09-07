ALTER TABLE "application" ADD COLUMN IF NOT EXISTS "domains" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "user_job" ADD COLUMN IF NOT EXISTS "is_tech" text;
