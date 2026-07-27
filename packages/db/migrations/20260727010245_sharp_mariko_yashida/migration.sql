CREATE TYPE "custom_domain_status_enum" AS ENUM('pending', 'verified', 'failed');--> statement-breakpoint
CREATE TABLE "user_custom_domain" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"hostname" text NOT NULL,
	"status" "custom_domain_status_enum" DEFAULT 'pending'::"custom_domain_status_enum" NOT NULL,
	"verification_token" text NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "user_custom_domain_hostname_unique_idx" ON "user_custom_domain" ("hostname");--> statement-breakpoint
CREATE UNIQUE INDEX "user_custom_domain_user_id_unique_idx" ON "user_custom_domain" ("user_id");--> statement-breakpoint
ALTER TABLE "user_custom_domain" ADD CONSTRAINT "user_custom_domain_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;