DROP INDEX IF EXISTS "application_posting_id_idx";
--> statement-breakpoint
ALTER TABLE "application" DROP COLUMN IF EXISTS "posting_id";
--> statement-breakpoint
ALTER TABLE "job_preference" DROP COLUMN IF EXISTS "title_id";
--> statement-breakpoint
ALTER TABLE "job_preference" DROP COLUMN IF EXISTS "custom_title";
--> statement-breakpoint
ALTER TABLE "job_preference" DROP COLUMN IF EXISTS "level_floor";
--> statement-breakpoint
ALTER TABLE "job_preference" DROP COLUMN IF EXISTS "exclude_keywords";
--> statement-breakpoint
ALTER TABLE "job_preference" DROP COLUMN IF EXISTS "locations";
--> statement-breakpoint
ALTER TABLE "job_preference" DROP COLUMN IF EXISTS "remote_regions";
--> statement-breakpoint
ALTER TABLE "job_preference" DROP COLUMN IF EXISTS "jobs_per_run";
--> statement-breakpoint
DROP INDEX IF EXISTS "job_posting_company_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "job_posting_closed_at_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "job_posting_listing_url_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "job_posting_adapter_external_uidx";
--> statement-breakpoint
DROP INDEX IF EXISTS "job_company_slug_uidx";
--> statement-breakpoint
DROP TABLE IF EXISTS "job_posting";
--> statement-breakpoint
DROP TABLE IF EXISTS "job_company";
