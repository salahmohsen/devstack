ALTER TYPE "application_activity_kind" ADD VALUE IF NOT EXISTS 'silence_nudged';--> statement-breakpoint
ALTER TYPE "application_activity_kind" ADD VALUE IF NOT EXISTS 'ghosted_suggested';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mail_message_application_id_idx" ON "mail_message" ("application_id");
