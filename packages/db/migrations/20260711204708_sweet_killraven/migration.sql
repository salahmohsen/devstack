DROP TABLE "project_stack_scan";--> statement-breakpoint
DROP TABLE "stack_alias";--> statement-breakpoint
DROP INDEX "stack_npm_package_unique_idx";--> statement-breakpoint
ALTER TABLE "stack" DROP COLUMN "npm_package";--> statement-breakpoint
ALTER TABLE "stack" DROP COLUMN "type";--> statement-breakpoint
ALTER TABLE "stack" DROP COLUMN "suggested_icon";--> statement-breakpoint
ALTER TABLE "stack" DROP COLUMN "icon_svg";--> statement-breakpoint
ALTER TABLE "stack" DROP COLUMN "health_status";--> statement-breakpoint
ALTER TABLE "stack" DROP COLUMN "confidence";