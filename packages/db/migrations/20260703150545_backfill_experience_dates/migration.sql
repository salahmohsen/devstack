-- Backfill: clear from_date/to_date values that are not in YYYY-MM-DD format.
--
-- The columns are typed as text and the form previously accepted arbitrary
-- strings, which means rows may contain values like "Aug 2024" or
-- "Summer 2024". Those values crash date-fns `format()` on the dashboard.
-- We can't reliably coerce free-form date strings to a calendar date, so
-- the conservative fix is to null them out. The UI already renders a null
-- from_date as "Ongoing" and a null to_date as "Present", so this is the
-- least-surprising fallback.
UPDATE "experience"
SET "from_date" = NULL
WHERE "from_date" IS NOT NULL
  AND "from_date" !~ '^\d{4}-\d{2}-\d{2}$';

UPDATE "experience"
SET "to_date" = NULL
WHERE "to_date" IS NOT NULL
  AND "to_date" !~ '^\d{4}-\d{2}-\d{2}$';
