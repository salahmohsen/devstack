CREATE TYPE "mail_reply_autonomy_enum" AS ENUM('assist', 'full');--> statement-breakpoint
CREATE TABLE "user_ai_settings" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"providers" jsonb DEFAULT '[]' NOT NULL,
	"models" jsonb NOT NULL,
	"mail_reply_autonomy" "mail_reply_autonomy_enum" DEFAULT 'assist'::"mail_reply_autonomy_enum" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_notification_settings" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"notification_email" text,
	"channels" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "user_ai_settings_user_id_unique_idx" ON "user_ai_settings" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_notification_settings_user_id_unique_idx" ON "user_notification_settings" ("user_id");--> statement-breakpoint
ALTER TABLE "user_ai_settings" ADD CONSTRAINT "user_ai_settings_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_notification_settings" ADD CONSTRAINT "user_notification_settings_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;