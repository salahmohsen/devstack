CREATE TABLE "app_notification" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"href" text,
	"message_id" text,
	"application_id" text,
	"review_item_id" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "app_notification_user_id_idx" ON "app_notification" ("user_id");--> statement-breakpoint
CREATE INDEX "app_notification_user_id_created_at_idx" ON "app_notification" ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "app_notification_user_id_read_at_idx" ON "app_notification" ("user_id","read_at");--> statement-breakpoint
ALTER TABLE "app_notification" ADD CONSTRAINT "app_notification_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "app_notification" ADD CONSTRAINT "app_notification_message_id_mail_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "mail_message"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "app_notification" ADD CONSTRAINT "app_notification_application_id_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "application"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "app_notification" ADD CONSTRAINT "app_notification_review_item_id_review_item_id_fkey" FOREIGN KEY ("review_item_id") REFERENCES "review_item"("id") ON DELETE SET NULL;