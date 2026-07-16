CREATE TABLE "project_stack_scan" (
	"id" text PRIMARY KEY,
	"project_id" text NOT NULL,
	"run_id" text,
	"scanned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"detected_packages" text[],
	"detected_stack_ids" text[]
);
--> statement-breakpoint
CREATE TABLE "stack_alias" (
	"id" text PRIMARY KEY,
	"stack_id" text NOT NULL,
	"npm_package" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stack" ADD COLUMN "npm_package" text;--> statement-breakpoint
ALTER TABLE "stack" ADD COLUMN "type" text;--> statement-breakpoint
ALTER TABLE "stack" ADD COLUMN "suggested_icon" text;--> statement-breakpoint
ALTER TABLE "stack" ADD COLUMN "icon_svg" text;--> statement-breakpoint
ALTER TABLE "stack" ADD COLUMN "health_status" json;--> statement-breakpoint
ALTER TABLE "stack" ADD COLUMN "confidence" text;--> statement-breakpoint
CREATE INDEX "project_stack_scan_project_id_idx" ON "project_stack_scan" ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stack_alias_npm_package_unique_idx" ON "stack_alias" ("npm_package");--> statement-breakpoint
CREATE INDEX "stack_alias_stack_id_idx" ON "stack_alias" ("stack_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stack_npm_package_unique_idx" ON "stack" ("npm_package");--> statement-breakpoint
ALTER TABLE "project_stack_scan" ADD CONSTRAINT "project_stack_scan_project_id_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "stack_alias" ADD CONSTRAINT "stack_alias_stack_id_stack_id_fkey" FOREIGN KEY ("stack_id") REFERENCES "stack"("id") ON DELETE CASCADE;