ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "username" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "display_username" text;--> statement-breakpoint
UPDATE "user" SET "username" = "profile_name" WHERE "username" IS NULL AND "profile_name" IS NOT NULL;--> statement-breakpoint
UPDATE "user" SET "display_username" = "username" WHERE "display_username" IS NULL AND "username" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "username" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_username_unique" ON "user" USING btree ("username");--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN IF EXISTS "profile_name";--> statement-breakpoint
ALTER TABLE IF EXISTS "profile_slug_alias" RENAME TO "username_slug_alias";--> statement-breakpoint
ALTER INDEX IF EXISTS "profile_slug_alias_slug_unique_idx" RENAME TO "username_slug_alias_slug_unique_idx";
