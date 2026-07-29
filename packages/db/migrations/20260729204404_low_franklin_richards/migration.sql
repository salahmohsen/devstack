CREATE TYPE "review_item_kind" AS ENUM('reply_draft');--> statement-breakpoint
CREATE TYPE "review_item_status" AS ENUM('pending', 'confirmed', 'discarded', 'sent');--> statement-breakpoint
CREATE TABLE "review_item" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"kind" "review_item_kind" DEFAULT 'reply_draft'::"review_item_kind" NOT NULL,
	"status" "review_item_status" DEFAULT 'pending'::"review_item_status" NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"preview" text DEFAULT '' NOT NULL,
	"body_text" text DEFAULT '' NOT NULL,
	"body_html" text,
	"to_email" text,
	"subject" text,
	"message_id" text,
	"application_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "review_item_user_id_idx" ON "review_item" ("user_id");--> statement-breakpoint
CREATE INDEX "review_item_user_id_status_idx" ON "review_item" ("user_id","status");--> statement-breakpoint
CREATE INDEX "review_item_message_id_idx" ON "review_item" ("message_id");--> statement-breakpoint
ALTER TABLE "review_item" ADD CONSTRAINT "review_item_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "review_item" ADD CONSTRAINT "review_item_message_id_mail_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "mail_message"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "review_item" ADD CONSTRAINT "review_item_application_id_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "application"("id") ON DELETE SET NULL;