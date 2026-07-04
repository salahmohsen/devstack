CREATE TYPE "portfolio_entry_type_enum" AS ENUM('experience', 'project', 'stack', 'contact');--> statement-breakpoint
CREATE TABLE "portfolio_entry" (
	"id" text PRIMARY KEY,
	"type" "portfolio_entry_type_enum" NOT NULL,
	"entity_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contact" ADD COLUMN "portfolio_entry_id" text;--> statement-breakpoint
ALTER TABLE "experience" ADD COLUMN "portfolio_entry_id" text;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "portfolio_entry_id" text;--> statement-breakpoint
ALTER TABLE "stack" ADD COLUMN "portfolio_entry_id" text;--> statement-breakpoint
ALTER TABLE "experience" DROP COLUMN "enable_ai";--> statement-breakpoint
ALTER TABLE "project" DROP COLUMN "enable_ai";--> statement-breakpoint
ALTER TABLE "stack" DROP COLUMN "enable_ai";--> statement-breakpoint
CREATE INDEX "experience_portfolio_entry_id_idx" ON "experience" ("portfolio_entry_id");--> statement-breakpoint
CREATE UNIQUE INDEX "portfolio_entry_type_entity_id_unique_idx" ON "portfolio_entry" ("type","entity_id");--> statement-breakpoint
CREATE INDEX "project_portfolio_entry_id_idx" ON "project" ("portfolio_entry_id");--> statement-breakpoint
CREATE INDEX "stack_portfolio_entry_id_idx" ON "stack" ("portfolio_entry_id");--> statement-breakpoint
ALTER TABLE "contact" ADD CONSTRAINT "contact_portfolio_entry_id_portfolio_entry_id_fkey" FOREIGN KEY ("portfolio_entry_id") REFERENCES "portfolio_entry"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "experience" ADD CONSTRAINT "experience_portfolio_entry_id_portfolio_entry_id_fkey" FOREIGN KEY ("portfolio_entry_id") REFERENCES "portfolio_entry"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_portfolio_entry_id_portfolio_entry_id_fkey" FOREIGN KEY ("portfolio_entry_id") REFERENCES "portfolio_entry"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "stack" ADD CONSTRAINT "stack_portfolio_entry_id_portfolio_entry_id_fkey" FOREIGN KEY ("portfolio_entry_id") REFERENCES "portfolio_entry"("id") ON DELETE SET NULL;