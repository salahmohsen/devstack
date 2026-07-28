ALTER TABLE "application" ALTER COLUMN "source" TYPE text USING "source"::text;--> statement-breakpoint
DROP TYPE "application_source";--> statement-breakpoint
CREATE TYPE "application_source" AS ENUM('linkedin', 'indeed', 'company_website', 'referral', 'recruiter', 'other');--> statement-breakpoint
UPDATE "application" SET "source" = CASE
  WHEN "source" = 'company_site' THEN 'company_website'
  WHEN "source" = 'job_board' THEN 'other'
  WHEN "source" IN ('linkedin', 'indeed', 'company_website', 'referral', 'recruiter', 'other') THEN "source"
  ELSE NULL
END;--> statement-breakpoint
ALTER TABLE "application" ALTER COLUMN "source" TYPE "application_source" USING "source"::"application_source";
