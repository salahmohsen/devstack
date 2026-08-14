ALTER TABLE "stack" ADD COLUMN IF NOT EXISTS "is_featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_ai_settings" ADD COLUMN IF NOT EXISTS "hub_personality" text DEFAULT 'cairo' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_ai_settings" ADD COLUMN IF NOT EXISTS "hub_avatar" text DEFAULT 'scarab' NOT NULL;
