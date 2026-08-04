ALTER TABLE "application" ADD COLUMN "recruiter_email" text;--> statement-breakpoint
ALTER TABLE "application" ADD COLUMN "cover_letter_body" text;--> statement-breakpoint
ALTER TABLE "application" ADD COLUMN "cover_letter_r2_key" text;--> statement-breakpoint
ALTER TABLE "application" ADD COLUMN "cover_letter_filename" text;--> statement-breakpoint
ALTER TABLE "application" ADD COLUMN "outreach_subject" text;--> statement-breakpoint
ALTER TABLE "application" ADD COLUMN "outreach_body" text;--> statement-breakpoint
ALTER TABLE "application" ADD COLUMN "outreach_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "application" ADD COLUMN "outreach_provider_message_id" text;--> statement-breakpoint
ALTER TABLE "application" ADD COLUMN "apply_package_draft" jsonb;--> statement-breakpoint
ALTER TABLE "application" ADD COLUMN "apply_package_drafted_at" timestamp with time zone;