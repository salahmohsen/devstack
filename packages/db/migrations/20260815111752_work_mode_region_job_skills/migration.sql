ALTER TABLE "application" ADD COLUMN "work_mode" text;--> statement-breakpoint
ALTER TABLE "application" ADD COLUMN "hiring_region" text;--> statement-breakpoint
ALTER TABLE "application" ADD COLUMN "required_skills" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "application" ADD COLUMN "preferred_skills" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "job_posting" ADD COLUMN "hiring_region" text;--> statement-breakpoint
ALTER TABLE "job_posting" ADD COLUMN "employment_type" text;