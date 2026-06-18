UPDATE "experience" SET "description" = '' WHERE "description" IS NULL;--> statement-breakpoint
UPDATE "project" SET "description" = '' WHERE "description" IS NULL;--> statement-breakpoint
ALTER TABLE "experience" ALTER COLUMN "description" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ALTER COLUMN "description" SET NOT NULL;
