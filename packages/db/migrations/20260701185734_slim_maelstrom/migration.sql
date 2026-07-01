DO $$ BEGIN
  CREATE TYPE "contact_type_enum" AS ENUM('website', 'email', 'location');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "github_config" (
	"user_id" text PRIMARY KEY,
	"github_token" text,
	"github_username" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "account" (
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
CREATE TABLE IF NOT EXISTS "passkey" (
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
CREATE TABLE IF NOT EXISTS "session" (
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
CREATE TABLE IF NOT EXISTS "user" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification" (
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contact" (
	"user_id" text,
	"type" "contact_type_enum",
	"value" text NOT NULL,
	"icon" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "contact_pkey" PRIMARY KEY("user_id","type")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "experience" (
	"id" text PRIMARY KEY,
	"title" text NOT NULL,
	"organization" text NOT NULL,
	"description" text NOT NULL,
	"from_date" text,
	"to_date" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_archived" boolean DEFAULT false,
	"is_present" boolean DEFAULT false,
	"enable_ai" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "github_cache_namespace" (
	"namespace" text PRIMARY KEY,
	"version" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "github_response_cache" (
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
CREATE TABLE IF NOT EXISTS "github_revalidation_signal" (
	"signal_key" text PRIMARY KEY,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "github_webhook_event" (
	"delivery_id" text PRIMARY KEY,
	"event" text NOT NULL,
	"action" text,
	"scope" text,
	"payload" jsonb,
	"received_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project" (
	"id" text PRIMARY KEY,
	"logo" text,
	"repos" text[],
	"demo_url" text,
	"year" integer NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"description" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"experience_id" text,
	"is_present" boolean DEFAULT false,
	"enable_ai" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_stack" (
	"id" text PRIMARY KEY,
	"project_id" text NOT NULL,
	"stack_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stack" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"description" text,
	"icon" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"enable_ai" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "github_config_githubUsername_idx" ON "github_config" ("github_username");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "passkey_userId_idx" ON "passkey" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "passkey_credentialID_idx" ON "passkey" ("credential_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" ("identifier");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "experience_sort_order_idx" ON "experience" ("sort_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "github_response_cache_namespace_idx" ON "github_response_cache" ("namespace");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "github_response_cache_owner_idx" ON "github_response_cache" ("owner");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "github_webhook_event_event_idx" ON "github_webhook_event" ("event");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_sort_order_idx" ON "project" ("sort_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_experience_id_idx" ON "project" ("experience_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_stack_project_id_idx" ON "project_stack" ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_stack_stack_id_idx" ON "project_stack" ("stack_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "project_stack_project_id_stack_id_unique_idx" ON "project_stack" ("project_id","stack_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "stack_name_unique_idx" ON "stack" ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stack_sort_order_idx" ON "stack" ("sort_order");--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "github_config" ADD CONSTRAINT "github_config_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "passkey" ADD CONSTRAINT "passkey_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "contact" ADD CONSTRAINT "contact_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "project" ADD CONSTRAINT "project_experience_id_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "experience"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "project_stack" ADD CONSTRAINT "project_stack_project_id_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "project_stack" ADD CONSTRAINT "project_stack_stack_id_stack_id_fkey" FOREIGN KEY ("stack_id") REFERENCES "stack"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;