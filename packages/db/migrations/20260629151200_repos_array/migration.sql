ALTER TABLE "project" ADD COLUMN "repos" text[];--> statement-breakpoint
UPDATE "project" SET "repos" = ARRAY["repo"]::text[] WHERE "repo" IS NOT NULL;--> statement-breakpoint
UPDATE "project" SET "repos" = ARRAY[]::text[] WHERE "repo" IS NULL;--> statement-breakpoint
ALTER TABLE "project" DROP COLUMN "repo";--> statement-breakpoint
ALTER TABLE "project" ALTER COLUMN "repos" SET NOT NULL;
