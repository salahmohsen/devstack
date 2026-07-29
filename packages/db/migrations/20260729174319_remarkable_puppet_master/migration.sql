CREATE TYPE "mail_provider" AS ENUM('resend', 'gmail', 'manual');--> statement-breakpoint
CREATE TYPE "mail_purpose" AS ENUM('career', 'system_notification');--> statement-breakpoint
CREATE TABLE "mail_attachment" (
	"id" text PRIMARY KEY,
	"message_id" text NOT NULL,
	"user_id" text NOT NULL,
	"filename" text NOT NULL,
	"content_type" text,
	"size_bytes" integer,
	"storage_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mail_message" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"provider" "mail_provider" DEFAULT 'manual'::"mail_provider" NOT NULL,
	"provider_message_id" text,
	"from_name" text DEFAULT '' NOT NULL,
	"from_email" text NOT NULL,
	"to_email" text,
	"subject" text DEFAULT '' NOT NULL,
	"preview" text DEFAULT '' NOT NULL,
	"body_text" text DEFAULT '' NOT NULL,
	"body_html" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unread" boolean DEFAULT true NOT NULL,
	"purpose" "mail_purpose" DEFAULT 'career'::"mail_purpose" NOT NULL,
	"labels" text[] DEFAULT '{}'::text[] NOT NULL,
	"application_id" text,
	"classified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "mail_attachment_message_id_idx" ON "mail_attachment" ("message_id");--> statement-breakpoint
CREATE INDEX "mail_attachment_user_id_idx" ON "mail_attachment" ("user_id");--> statement-breakpoint
CREATE INDEX "mail_message_user_id_idx" ON "mail_message" ("user_id");--> statement-breakpoint
CREATE INDEX "mail_message_user_id_received_at_idx" ON "mail_message" ("user_id","received_at");--> statement-breakpoint
CREATE INDEX "mail_message_user_id_purpose_idx" ON "mail_message" ("user_id","purpose");--> statement-breakpoint
CREATE UNIQUE INDEX "mail_message_user_provider_msg_uidx" ON "mail_message" ("user_id","provider","provider_message_id") WHERE provider_message_id is not null;--> statement-breakpoint
ALTER TABLE "mail_attachment" ADD CONSTRAINT "mail_attachment_message_id_mail_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "mail_message"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "mail_attachment" ADD CONSTRAINT "mail_attachment_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "mail_message" ADD CONSTRAINT "mail_message_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "mail_message" ADD CONSTRAINT "mail_message_application_id_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "application"("id") ON DELETE SET NULL;