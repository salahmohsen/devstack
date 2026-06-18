CREATE TABLE "experience" (
	"id" text PRIMARY KEY,
	"title" text NOT NULL,
	"organization" text NOT NULL,
	"description" text,
	"from_date" text,
	"to_date" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" text PRIMARY KEY,
	"logo" text,
	"year" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
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
CREATE INDEX "experience_sort_order_idx" ON "experience" ("sort_order");--> statement-breakpoint
CREATE INDEX "project_sort_order_idx" ON "project" ("sort_order");--> statement-breakpoint
CREATE INDEX "project_experience_id_idx" ON "project" ("experience_id");--> statement-breakpoint
CREATE INDEX "project_stack_project_id_idx" ON "project_stack" ("project_id");--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_experience_id_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "experience"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "project_stack" ADD CONSTRAINT "project_stack_project_id_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE;