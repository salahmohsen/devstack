CREATE TABLE IF NOT EXISTS "user_job" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "freehire_slug" text NOT NULL,
  "title" text NOT NULL,
  "company_name" text NOT NULL,
  "company_slug" text,
  "company_logo_url" text,
  "listing_url" text NOT NULL,
  "location" text,
  "work_mode" text,
  "employment_type" text,
  "seniority" text,
  "experience_years_min" integer,
  "salary_min" integer,
  "salary_max" integer,
  "salary_currency" text,
  "skills" jsonb DEFAULT '[]' NOT NULL,
  "category" text,
  "domains" jsonb DEFAULT '[]' NOT NULL,
  "summary" text,
  "description" text,
  "posted_at" timestamp with time zone,
  "reality" text,
  "source" text,
  "query_hash" text NOT NULL,
  "query_filters" jsonb NOT NULL,
  "first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_job_user_slug_uidx" ON "user_job" ("user_id", "freehire_slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_job_user_seen_idx" ON "user_job" ("user_id", "last_seen_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_job_user_query_idx" ON "user_job" ("user_id", "query_hash");
--> statement-breakpoint
ALTER TABLE "application" ADD COLUMN IF NOT EXISTS "job_id" text REFERENCES "user_job"("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "application_job_id_idx" ON "application" ("job_id");
