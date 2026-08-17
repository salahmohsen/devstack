ALTER TABLE "user_hub_state" ADD COLUMN IF NOT EXISTS "hub_chat_epoch" integer DEFAULT 0 NOT NULL;
