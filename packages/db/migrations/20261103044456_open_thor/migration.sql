CREATE TABLE "user_chatgpt_plan" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"host_id" text NOT NULL,
	"client_id" text,
	"credentials_ciphertext" text,
	"email" text,
	"subject" text,
	"plan_type" text,
	"scopes" jsonb DEFAULT '[]' NOT NULL,
	"access_expires_at" timestamp with time zone,
	"needs_reconnect" boolean DEFAULT false NOT NULL,
	"last_error_code" text,
	"last_error_at" timestamp with time zone,
	"pending_state" text,
	"pending_verifier_ciphertext" text,
	"pending_nonce" text,
	"pending_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "user_chatgpt_plan_user_id_unique_idx" ON "user_chatgpt_plan" ("user_id");--> statement-breakpoint
ALTER TABLE "user_chatgpt_plan" ADD CONSTRAINT "user_chatgpt_plan_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;