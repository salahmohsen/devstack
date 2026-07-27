-- Add profile_name nullable first so existing rows can be backfilled before NOT NULL.
ALTER TABLE "user" ADD COLUMN "profile_name" text;--> statement-breakpoint
-- Backfill from display name slugify (lowercase, non-alnum → hyphens).
-- Ensures uniqueness by appending -<short id> when collisions remain after slugify.
UPDATE "user" AS u
SET "profile_name" = sub.final_name
FROM (
  SELECT
    id,
    CASE
      WHEN row_number() OVER (PARTITION BY base_slug ORDER BY created_at, id) = 1
        THEN base_slug
      ELSE left(base_slug, greatest(1, 30 - 1 - length(suffix))) || '-' || suffix
    END AS final_name
  FROM (
    SELECT
      id,
      created_at,
      left(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              lower(trim(coalesce(nullif(trim(name), ''), split_part(email, '@', 1), 'user'))),
              '[^a-z0-9]+',
              '-',
              'g'
            ),
            '^-+|-+$',
            '',
            'g'
          ),
          '-+',
          '-',
          'g'
        ),
        30
      ) AS base_slug,
      left(id, 6) AS suffix
    FROM "user"
  ) AS slugged
) AS sub
WHERE u.id = sub.id;--> statement-breakpoint
-- Safety net: any row still null gets a deterministic fallback.
UPDATE "user"
SET "profile_name" = 'user-' || left(id, 12)
WHERE "profile_name" IS NULL OR "profile_name" = '';--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "profile_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_profile_name_key" UNIQUE("profile_name");
