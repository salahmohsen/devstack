ALTER TYPE "contact_type_enum" ADD VALUE 'instagram';--> statement-breakpoint
ALTER TYPE "contact_type_enum" ADD VALUE 'discord';--> statement-breakpoint
ALTER TYPE "contact_type_enum" ADD VALUE 'bluesky';--> statement-breakpoint
ALTER TYPE "contact_type_enum" ADD VALUE 'mastodon';--> statement-breakpoint
ALTER TYPE "contact_type_enum" ADD VALUE 'telegram';--> statement-breakpoint
ALTER TABLE "contact" DROP COLUMN IF EXISTS "icon";
