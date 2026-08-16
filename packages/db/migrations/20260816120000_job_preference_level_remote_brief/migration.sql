ALTER TABLE "job_preference" ADD COLUMN "remote_regions" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "job_preference" ADD COLUMN "level_floor" text;--> statement-breakpoint
ALTER TABLE "job_preference" ADD COLUMN "search_brief_markdown" text;--> statement-breakpoint
ALTER TABLE "job_preference" ADD COLUMN "search_brief_hash" text;--> statement-breakpoint
ALTER TABLE "job_preference" ADD COLUMN "search_brief_previous_markdown" text;--> statement-breakpoint
ALTER TABLE "job_preference" ADD COLUMN "search_brief_built_at" timestamptz;

-- Copy non-worldwide hiring-region slugs from locations onto remote_regions, then
-- strip worldwide tokens from locations. Mapping mirrors
-- packages/core/src/job-discovery/hiring-region.ts SYNONYM_TO_SLUG (live dictionary
-- stays in TS — see backfill.ts next to this file).
WITH map(raw, slug) AS (
  VALUES
    ('latam', 'latam'),
    ('latin america', 'latam'),
    ('lat am', 'latam'),
    ('lat-am', 'latam'),
    ('mena', 'mena'),
    ('middle east', 'mena'),
    ('gcc', 'mena'),
    ('egypt', 'egypt'),
    ('eg', 'egypt'),
    ('cairo', 'egypt'),
    ('saudi', 'saudi_arabia'),
    ('saudi arabia', 'saudi_arabia'),
    ('ksa', 'saudi_arabia'),
    ('riyadh', 'saudi_arabia'),
    ('saudi_arabia', 'saudi_arabia'),
    ('emea', 'emea'),
    ('eu', 'eu'),
    ('europe', 'eu'),
    ('remote eu', 'eu'),
    ('remote - eu', 'eu'),
    ('uk', 'uk'),
    ('united kingdom', 'uk'),
    ('us', 'us'),
    ('usa', 'us'),
    ('united states', 'us'),
    ('us only', 'us'),
    ('remote us', 'us'),
    ('africa', 'africa'),
    ('apac', 'apac'),
    ('asia pacific', 'apac'),
    ('de', 'de'),
    ('germany', 'de'),
    ('br', 'br'),
    ('brazil', 'br')
),
norm AS (
  SELECT
    jp.id,
    loc.ord,
    loc.token,
    lower(trim(both FROM regexp_replace(
      regexp_replace(
        regexp_replace(loc.token, '[—–]', '-', 'g'),
        '[_/]+',
        ' ',
        'g'
      ),
      '\s+',
      ' ',
      'g'
    ))) AS key
  FROM "job_preference" jp
  CROSS JOIN LATERAL jsonb_array_elements_text(jp.locations) WITH ORDINALITY AS loc(token, ord)
),
computed AS (
  SELECT
    jp.id,
    COALESCE((
      SELECT jsonb_agg(DISTINCT m.slug)
      FROM norm n
      JOIN map m ON m.raw = n.key OR m.slug = replace(n.key, ' ', '_')
      WHERE n.id = jp.id
        AND m.slug IS DISTINCT FROM 'worldwide'
    ), '[]'::jsonb) AS remote_regions,
    COALESCE((
      SELECT jsonb_agg(n.token ORDER BY n.ord)
      FROM norm n
      LEFT JOIN map m ON m.raw = n.key OR m.slug = replace(n.key, ' ', '_')
      WHERE n.id = jp.id
        AND COALESCE(m.slug, '') IS DISTINCT FROM 'worldwide'
        AND n.key NOT IN ('worldwide', 'anywhere', 'global', 'remote worldwide')
    ), '[]'::jsonb) AS locations
  FROM "job_preference" jp
)
UPDATE "job_preference" AS jp
SET
  "remote_regions" = c.remote_regions,
  "locations" = c.locations
FROM computed c
WHERE jp.id = c.id;
