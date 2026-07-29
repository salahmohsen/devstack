CREATE TABLE "user_mail_settings" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"inbound_enabled" boolean DEFAULT false NOT NULL,
	"inbound_address" text,
	"resend_api_key_last4" text,
	"resend_api_key_ciphertext" text,
	"webhook_secret_last4" text,
	"webhook_secret_ciphertext" text,
	"webhook_token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "user_mail_settings_user_id_unique_idx" ON "user_mail_settings" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_mail_settings_webhook_token_unique_idx" ON "user_mail_settings" ("webhook_token");--> statement-breakpoint
ALTER TABLE "user_mail_settings" ADD CONSTRAINT "user_mail_settings_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;