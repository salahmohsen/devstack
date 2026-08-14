CREATE TABLE "job_posting" (
	"id" text PRIMARY KEY,
	"adapter_id" text NOT NULL,
	"external_id" text NOT NULL,
	"listing_url" text NOT NULL,
	"title" text NOT NULL,
	"company_name" text NOT NULL,
	"location" text,
	"work_mode" text,
	"salary_min" integer,
	"salary_max" integer,
	"salary_currency" text,
	"skills" jsonb DEFAULT '[]' NOT NULL,
	"description" text,
	"source_platform" text,
	"content_hash" text NOT NULL,
	"posted_at" timestamp with time zone,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"raw" jsonb
);
--> statement-breakpoint
CREATE TABLE "user_job_ai_budget" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"day_utc" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "application" ADD COLUMN "posting_id" text;--> statement-breakpoint
ALTER TABLE "application" ADD COLUMN "inbox_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "application" ADD COLUMN "discovery_run_id" text;--> statement-breakpoint
ALTER TABLE "job_preference" ADD COLUMN "title_id" text;--> statement-breakpoint
ALTER TABLE "job_preference" ADD COLUMN "custom_title" text;--> statement-breakpoint
ALTER TABLE "job_preference" ADD COLUMN "jobs_per_run" integer DEFAULT 25 NOT NULL;--> statement-breakpoint
ALTER TABLE "job_preference" ADD COLUMN "import_from_email" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "application_user_id_discovery_run_id_idx" ON "application" ("user_id","discovery_run_id");--> statement-breakpoint
CREATE INDEX "application_posting_id_idx" ON "application" ("posting_id");--> statement-breakpoint
CREATE UNIQUE INDEX "job_posting_adapter_external_uidx" ON "job_posting" ("adapter_id","external_id");--> statement-breakpoint
CREATE INDEX "job_posting_listing_url_idx" ON "job_posting" ("listing_url");--> statement-breakpoint
CREATE INDEX "job_posting_closed_at_idx" ON "job_posting" ("closed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_job_ai_budget_user_id_day_utc_uidx" ON "user_job_ai_budget" ("user_id","day_utc");--> statement-breakpoint
ALTER TABLE "application" ADD CONSTRAINT "application_posting_id_job_posting_id_fkey" FOREIGN KEY ("posting_id") REFERENCES "job_posting"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "user_job_ai_budget" ADD CONSTRAINT "user_job_ai_budget_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
