ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "role" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "banned" boolean DEFAULT false;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "ban_reason" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "ban_expires" timestamp;

ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "impersonated_by" text;

ALTER TABLE "invite" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "invite" ADD COLUMN IF NOT EXISTS "max_uses" integer;
ALTER TABLE "invite" ADD COLUMN IF NOT EXISTS "use_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "invite" ADD COLUMN IF NOT EXISTS "revoked_at" timestamp with time zone;

UPDATE "invite" SET "use_count" = 1 WHERE "used_at" IS NOT NULL AND "use_count" = 0;
UPDATE "invite" SET "max_uses" = 1 WHERE "max_uses" IS NULL;

CREATE TABLE IF NOT EXISTS "invite_redemption" (
  "id" text PRIMARY KEY,
  "invite_id" text NOT NULL REFERENCES "invite"("id") ON DELETE CASCADE,
  "user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "used_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "invite_redemption_invite_user_unique_idx"
  ON "invite_redemption" ("invite_id", "user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "invite_redemption_user_id_unique_idx"
  ON "invite_redemption" ("user_id");

INSERT INTO "invite_redemption" ("id", "invite_id", "user_id", "used_at")
SELECT 'redemption:' || i.id, i.id, i.used_by_user_id, i.used_at
FROM "invite" i
WHERE i.used_by_user_id IS NOT NULL AND i.used_at IS NOT NULL
ON CONFLICT ("user_id") DO NOTHING;

CREATE TABLE IF NOT EXISTS "platform_setting" (
  "id" text PRIMARY KEY,
  "signup_mode" text DEFAULT 'invite_only' NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by_user_id" text REFERENCES "user"("id") ON DELETE SET NULL
);

INSERT INTO "platform_setting" ("id", "signup_mode")
VALUES ('default', 'invite_only')
ON CONFLICT ("id") DO NOTHING;

UPDATE "user"
SET "role" = 'admin'
WHERE "id" = (SELECT "id" FROM "user" ORDER BY "created_at" ASC LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM "user" WHERE "role" = 'admin');

UPDATE "user" SET "role" = 'user' WHERE "role" IS NULL;
UPDATE "user" SET "banned" = false WHERE "banned" IS NULL;
