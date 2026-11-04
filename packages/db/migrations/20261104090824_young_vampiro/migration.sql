CREATE TABLE "job_discovery_run" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"run_id" text NOT NULL,
	"stage" text DEFAULT 'queued' NOT NULL,
	"reason" text,
	"fetched" integer DEFAULT 0 NOT NULL,
	"query_hash" text,
	"candidates" jsonb DEFAULT '{}' NOT NULL,
	"warnings" jsonb DEFAULT '[]' NOT NULL,
	"land_finished" boolean DEFAULT false NOT NULL,
	"scheduled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"retry_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_job" ADD COLUMN "regions" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_job" ADD COLUMN "countries" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_job" ADD COLUMN "cities" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_job" ADD COLUMN "salary_period" text;--> statement-breakpoint
CREATE UNIQUE INDEX "job_discovery_run_user_run_idx" ON "job_discovery_run" ("user_id","run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "job_discovery_run_active_user_idx" ON "job_discovery_run" ("user_id") WHERE "stage" not in ('completed', 'failed');--> statement-breakpoint
CREATE INDEX "job_discovery_run_user_created_idx" ON "job_discovery_run" ("user_id","created_at");--> statement-breakpoint
ALTER TABLE "job_discovery_run" ADD CONSTRAINT "job_discovery_run_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;