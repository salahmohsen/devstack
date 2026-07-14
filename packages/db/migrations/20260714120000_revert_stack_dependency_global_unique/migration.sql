DROP INDEX IF EXISTS "stack_dependency_stack_id_npm_package_unique_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "stack_dependency_npm_package_unique_idx" ON "stack_dependency" ("npm_package");
