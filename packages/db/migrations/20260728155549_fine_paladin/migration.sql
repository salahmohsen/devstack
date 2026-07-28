CREATE TYPE "application_source" AS ENUM('linkedin', 'referral', 'company_site', 'job_board', 'recruiter', 'other');--> statement-breakpoint
-- Free-text sources that are not enum members become null before cast.
UPDATE "application" SET "source" = NULL WHERE "source" IS NOT NULL AND "source" NOT IN (
  'linkedin', 'referral', 'company_site', 'job_board', 'recruiter', 'other'
);--> statement-breakpoint
ALTER TABLE "application" ALTER COLUMN "source" SET DATA TYPE "application_source" USING "source"::"application_source";
