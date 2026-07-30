ALTER TABLE "app_notification" ADD COLUMN "email_digest_pending" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "app_notification" ADD COLUMN "emailed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_notification_settings" ADD COLUMN "email_delivery_mode" text DEFAULT 'immediate' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_notification_settings" ADD COLUMN "last_digest_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "app_notification_digest_pending_idx" ON "app_notification" ("user_id","email_digest_pending");