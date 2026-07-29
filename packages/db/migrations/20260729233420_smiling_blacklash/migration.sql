CREATE TABLE "user_gmail_sync" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"history_id" text,
	"email_address" text,
	"last_synced_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "user_gmail_sync_user_id_unique_idx" ON "user_gmail_sync" ("user_id");--> statement-breakpoint
ALTER TABLE "user_gmail_sync" ADD CONSTRAINT "user_gmail_sync_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;