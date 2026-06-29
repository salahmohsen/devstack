ALTER TABLE "project" ADD COLUMN "enable_ai" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "stack" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "stack" ADD COLUMN "enable_ai" boolean DEFAULT false NOT NULL;