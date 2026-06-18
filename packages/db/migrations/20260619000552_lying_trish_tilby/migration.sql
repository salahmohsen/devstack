CREATE TABLE "account" (
	"id" text PRIMARY KEY,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "passkey" (
	"id" text PRIMARY KEY,
	"name" text,
	"public_key" text NOT NULL,
	"user_id" text NOT NULL,
	"credential_id" text NOT NULL,
	"counter" integer NOT NULL,
	"device_type" text NOT NULL,
	"backed_up" boolean NOT NULL,
	"transports" text,
	"created_at" timestamp,
	"aaguid" text
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"user_id" text PRIMARY KEY,
	"github_token" text,
	"github_username" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "github_cache_namespace" (
	"namespace" text PRIMARY KEY,
	"version" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "github_response_cache" (
	"cache_key" text PRIMARY KEY,
	"namespace" text NOT NULL,
	"owner" text NOT NULL,
	"namespace_version" integer DEFAULT 0 NOT NULL,
	"status" integer DEFAULT 200 NOT NULL,
	"etag" text,
	"last_modified" text,
	"payload" jsonb NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	"stale_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "github_revalidation_signal" (
	"signal_key" text PRIMARY KEY,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "github_webhook_event" (
	"delivery_id" text PRIMARY KEY,
	"event" text NOT NULL,
	"action" text,
	"scope" text,
	"payload" jsonb,
	"received_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "experience" (
	"id" text PRIMARY KEY,
	"title" text NOT NULL,
	"organization" text NOT NULL,
	"description" text NOT NULL,
	"from_date" text,
	"to_date" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_archived" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" text PRIMARY KEY,
	"logo" text,
	"year" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"from_date" text,
	"to_date" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"experience_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_stack" (
	"id" text PRIMARY KEY,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"icon_url" text
);
--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" ("user_id");--> statement-breakpoint
CREATE INDEX "passkey_userId_idx" ON "passkey" ("user_id");--> statement-breakpoint
CREATE INDEX "passkey_credentialID_idx" ON "passkey" ("credential_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");--> statement-breakpoint
CREATE INDEX "app_settings_githubUsername_idx" ON "app_settings" ("github_username");--> statement-breakpoint
CREATE INDEX "github_response_cache_namespace_idx" ON "github_response_cache" ("namespace");--> statement-breakpoint
CREATE INDEX "github_response_cache_owner_idx" ON "github_response_cache" ("owner");--> statement-breakpoint
CREATE INDEX "github_webhook_event_event_idx" ON "github_webhook_event" ("event");--> statement-breakpoint
CREATE INDEX "experience_sort_order_idx" ON "experience" ("sort_order");--> statement-breakpoint
CREATE INDEX "project_sort_order_idx" ON "project" ("sort_order");--> statement-breakpoint
CREATE INDEX "project_experience_id_idx" ON "project" ("experience_id");--> statement-breakpoint
CREATE INDEX "project_stack_project_id_idx" ON "project_stack" ("project_id");--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "passkey" ADD CONSTRAINT "passkey_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_experience_id_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "experience"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "project_stack" ADD CONSTRAINT "project_stack_project_id_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE;