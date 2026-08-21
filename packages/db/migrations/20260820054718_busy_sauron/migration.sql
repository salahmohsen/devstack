CREATE TABLE "job_company" (
	"id" text PRIMARY KEY,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"logo_url" text,
	"website" text,
	"tagline" text,
	"employee_count" integer,
	"company_size" text,
	"company_type" text,
	"hq_country" text,
	"profile" jsonb DEFAULT '{}' NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "application" ADD COLUMN "experience_years_min" integer;--> statement-breakpoint
ALTER TABLE "application" ADD COLUMN "company_logo_url" text;--> statement-breakpoint
ALTER TABLE "job_posting" ADD COLUMN "company_id" text;--> statement-breakpoint
ALTER TABLE "job_posting" ADD COLUMN "experience_years_min" integer;--> statement-breakpoint
ALTER TABLE "job_posting" ADD COLUMN "company_logo_url" text;--> statement-breakpoint
ALTER TABLE "job_posting" ADD COLUMN "closed_reason" text;--> statement-breakpoint
CREATE UNIQUE INDEX "job_company_slug_uidx" ON "job_company" ("slug");--> statement-breakpoint
CREATE INDEX "job_posting_company_id_idx" ON "job_posting" ("company_id");--> statement-breakpoint
ALTER TABLE "job_posting" ADD CONSTRAINT "job_posting_company_id_job_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "job_company"("id") ON DELETE SET NULL;