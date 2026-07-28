CREATE TYPE "application_outcome" AS ENUM('rejected', 'withdrawn', 'ghosted', 'accepted');--> statement-breakpoint
CREATE TYPE "application_stage" AS ENUM('saved', 'applied', 'screening', 'interview', 'offer');--> statement-breakpoint
CREATE TYPE "hiring_urgency" AS ENUM('unknown', 'immediate', 'soon', 'flexible');--> statement-breakpoint
CREATE TABLE "application" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"company_name" text NOT NULL,
	"title" text NOT NULL,
	"url" text,
	"source" text,
	"location" text,
	"salary_range" text,
	"description" text,
	"notes" text,
	"stage" "application_stage" DEFAULT 'saved'::"application_stage" NOT NULL,
	"stage_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"outcome" "application_outcome",
	"outcome_at" timestamp with time zone,
	"hiring_urgency" "hiring_urgency" DEFAULT 'unknown'::"hiring_urgency" NOT NULL,
	"resume_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "application_user_id_idx" ON "application" ("user_id");--> statement-breakpoint
CREATE INDEX "application_user_id_stage_idx" ON "application" ("user_id","stage");--> statement-breakpoint
ALTER TABLE "application" ADD CONSTRAINT "application_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "application" ADD CONSTRAINT "application_resume_id_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resume"("id") ON DELETE SET NULL;