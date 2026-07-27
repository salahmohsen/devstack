-- Add user_id to domain tables (nullable first for existing rows), backfill to
-- earliest user, then enforce NOT NULL + FKs + per-user unique indexes.
DROP INDEX "experience_sort_order_idx";--> statement-breakpoint
DROP INDEX "portfolio_entry_type_entity_id_unique_idx";--> statement-breakpoint
DROP INDEX "project_sort_order_idx";--> statement-breakpoint
DROP INDEX "stack_name_unique_idx";--> statement-breakpoint
DROP INDEX "stack_sort_order_idx";--> statement-breakpoint
ALTER TABLE "experience" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "portfolio_entry" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "resume" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "stack" ADD COLUMN "user_id" text;--> statement-breakpoint
UPDATE "experience" SET "user_id" = (SELECT "id" FROM "user" ORDER BY "created_at" ASC LIMIT 1) WHERE "user_id" IS NULL;--> statement-breakpoint
UPDATE "portfolio_entry" SET "user_id" = (SELECT "id" FROM "user" ORDER BY "created_at" ASC LIMIT 1) WHERE "user_id" IS NULL;--> statement-breakpoint
UPDATE "project" SET "user_id" = (SELECT "id" FROM "user" ORDER BY "created_at" ASC LIMIT 1) WHERE "user_id" IS NULL;--> statement-breakpoint
UPDATE "resume" SET "user_id" = (SELECT "id" FROM "user" ORDER BY "created_at" ASC LIMIT 1) WHERE "user_id" IS NULL;--> statement-breakpoint
UPDATE "stack" SET "user_id" = (SELECT "id" FROM "user" ORDER BY "created_at" ASC LIMIT 1) WHERE "user_id" IS NULL;--> statement-breakpoint
ALTER TABLE "experience" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "portfolio_entry" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "resume" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "stack" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "experience_user_id_sort_order_idx" ON "experience" ("user_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "portfolio_entry_user_id_type_entity_id_unique_idx" ON "portfolio_entry" ("user_id","type","entity_id");--> statement-breakpoint
CREATE INDEX "portfolio_entry_user_id_idx" ON "portfolio_entry" ("user_id");--> statement-breakpoint
CREATE INDEX "project_user_id_sort_order_idx" ON "project" ("user_id","sort_order");--> statement-breakpoint
CREATE INDEX "resume_user_id_idx" ON "resume" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "resume_one_default_per_user" ON "resume" ("user_id") WHERE "default" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "stack_user_id_name_unique_idx" ON "stack" ("user_id","name");--> statement-breakpoint
CREATE INDEX "stack_user_id_sort_order_idx" ON "stack" ("user_id","sort_order");--> statement-breakpoint
ALTER TABLE "experience" ADD CONSTRAINT "experience_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "portfolio_entry" ADD CONSTRAINT "portfolio_entry_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "resume" ADD CONSTRAINT "resume_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "stack" ADD CONSTRAINT "stack_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
