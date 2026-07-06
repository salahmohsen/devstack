-- Add an `id` column to `contact` so the API can address rows by a stable
-- identifier instead of relying solely on the (user_id, type) composite key.
--
-- The dev DB already has rows in this table with no `id`, so we cannot
-- `ADD COLUMN ... NOT NULL` directly. We add it nullable, backfill from
-- gen_random_uuid() (built-in to Postgres 13+, no pgcrypto dep required),
-- then enforce NOT NULL. The existing composite PK on (user_id, type)
-- remains the only PRIMARY KEY constraint on the table; we intentionally
-- do NOT add a second PK on (id) so the structural uniqueness guarantee
-- stays on the (user_id, type) pair.
ALTER TABLE "contact" ADD COLUMN "id" text;--> statement-breakpoint
UPDATE "contact" SET "id" = gen_random_uuid()::text WHERE "id" IS NULL;--> statement-breakpoint
ALTER TABLE "contact" ALTER COLUMN "id" SET NOT NULL;
