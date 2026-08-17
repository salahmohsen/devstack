CREATE TABLE "user_hub_state" (
	"user_id" text PRIMARY KEY,
	"daily_brief_opened_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mail_message" ADD COLUMN "summary" text;--> statement-breakpoint
ALTER TABLE "user_hub_state" ADD CONSTRAINT "user_hub_state_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;