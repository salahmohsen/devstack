ALTER TABLE "application" ADD COLUMN IF NOT EXISTS "fit_analysis" jsonb;--> statement-breakpoint
ALTER TABLE "application" ADD COLUMN IF NOT EXISTS "fit_analysis_package_hash" text;
