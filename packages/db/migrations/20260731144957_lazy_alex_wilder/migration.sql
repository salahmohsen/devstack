CREATE TYPE "application_apply_method" AS ENUM('easy_apply', 'external', 'email', 'unknown');--> statement-breakpoint
ALTER TABLE "application" ADD COLUMN "apply_url" text;--> statement-breakpoint
ALTER TABLE "application" ADD COLUMN "apply_method" "application_apply_method" DEFAULT 'unknown'::"application_apply_method" NOT NULL;--> statement-breakpoint
ALTER TABLE "application" ADD COLUMN "match_score" integer;