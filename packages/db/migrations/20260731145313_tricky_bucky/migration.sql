CREATE TABLE "job_preference" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"work_modes" jsonb DEFAULT '[]' NOT NULL,
	"locations" jsonb DEFAULT '[]' NOT NULL,
	"role_keywords" jsonb DEFAULT '[]' NOT NULL,
	"exclude_keywords" jsonb DEFAULT '[]' NOT NULL,
	"salary_min" integer,
	"salary_currency" text,
	"min_match_score" integer DEFAULT 60 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "job_preference_user_id_unique_idx" ON "job_preference" ("user_id");--> statement-breakpoint
ALTER TABLE "job_preference" ADD CONSTRAINT "job_preference_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;