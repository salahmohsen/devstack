ALTER TABLE "job_preference" ADD COLUMN IF NOT EXISTS "regions" jsonb;
--> statement-breakpoint
ALTER TABLE "job_preference" ADD COLUMN IF NOT EXISTS "countries" jsonb;
--> statement-breakpoint
ALTER TABLE "job_preference" ADD COLUMN IF NOT EXISTS "cities" jsonb;
--> statement-breakpoint
ALTER TABLE "job_preference" ADD COLUMN IF NOT EXISTS "categories" jsonb;
--> statement-breakpoint
ALTER TABLE "job_preference" ADD COLUMN IF NOT EXISTS "skills" jsonb;
--> statement-breakpoint
ALTER TABLE "job_preference" ADD COLUMN IF NOT EXISTS "seniority" jsonb;
--> statement-breakpoint
ALTER TABLE "job_preference" ADD COLUMN IF NOT EXISTS "experience_years_min" integer;
--> statement-breakpoint
ALTER TABLE "job_preference" ADD COLUMN IF NOT EXISTS "experience_years_max" integer;
--> statement-breakpoint
ALTER TABLE "job_preference" ADD COLUMN IF NOT EXISTS "employment_types" jsonb;
--> statement-breakpoint
ALTER TABLE "job_preference" ADD COLUMN IF NOT EXISTS "company_types" jsonb;
--> statement-breakpoint
ALTER TABLE "job_preference" ADD COLUMN IF NOT EXISTS "company_sizes" jsonb;
--> statement-breakpoint
ALTER TABLE "job_preference" ADD COLUMN IF NOT EXISTS "domains" jsonb;
--> statement-breakpoint
ALTER TABLE "job_preference" ADD COLUMN IF NOT EXISTS "collections" jsonb;
--> statement-breakpoint
ALTER TABLE "job_preference" ADD COLUMN IF NOT EXISTS "open_within_days" integer;
--> statement-breakpoint
ALTER TABLE "job_preference" ADD COLUMN IF NOT EXISTS "reality" jsonb;
--> statement-breakpoint
ALTER TABLE "job_preference" ADD COLUMN IF NOT EXISTS "visa_sponsorship" boolean;
--> statement-breakpoint
ALTER TABLE "job_preference" ADD COLUMN IF NOT EXISTS "requires_clearance" boolean;
