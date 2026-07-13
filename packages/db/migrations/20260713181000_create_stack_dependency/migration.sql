CREATE TABLE "stack_dependency" (
	"id" text PRIMARY KEY,
	"stack_id" text NOT NULL,
	"npm_package" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "stack_dependency_stack_id_npm_package_unique_idx" ON "stack_dependency" ("stack_id","npm_package");--> statement-breakpoint
CREATE INDEX "stack_dependency_stack_id_idx" ON "stack_dependency" ("stack_id");--> statement-breakpoint
ALTER TABLE "stack_dependency" ADD CONSTRAINT "stack_dependency_stack_id_stack_id_fkey" FOREIGN KEY ("stack_id") REFERENCES "stack"("id") ON DELETE CASCADE;
