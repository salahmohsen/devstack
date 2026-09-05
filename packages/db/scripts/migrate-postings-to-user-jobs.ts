/**
 * One-off data migration: repoint `application.posting_id` rows at `user_job`,
 * then reset the nullable legacy job-preference columns.
 *
 * Run from packages/db:
 *   pnpm run migrate-postings
 *
 * Idempotent — safe to re-run:
 *  - user_job inserts are ON CONFLICT (user_id, freehire_slug) DO NOTHING
 *  - applications are only repointed while `job_id IS NULL`
 *  - preference reset only nulls the nullable legacy columns
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../package.json")
);
const pg = require("pg") as typeof import("pg");

type JoinRow = {
  id: string;
  user_id: string;
  job_id: string | null;
  posting_id: string;
  adapter_id: string;
  external_id: string;
};

type PostingRow = {
  id: string;
  adapter_id: string;
  external_id: string;
  listing_url: string;
  title: string;
  company_name: string;
  company_logo_url: string | null;
  location: string | null;
  work_mode: string | null;
  employment_type: string | null;
  experience_years_min: number | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  skills: string[] | null;
  description: string | null;
  source_platform: string | null;
  posted_at: Date | null;
  first_seen_at: Date | null;
  last_seen_at: Date | null;
};

/** Freehire postings keep their slug; other adapters get a legacy-prefixed one. */
function slugFor(row: { adapter_id: string; external_id: string }): string {
  return row.adapter_id === "freehire"
    ? row.external_id
    : `legacy-${row.adapter_id}-${row.external_id}`;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  if (!/localhost|127\.0\.0\.1/.test(new URL(connectionString).host)) {
    throw new Error(`Refusing to run against non-local DB: ${new URL(connectionString).host}`);
  }

  const pool = new pg.Pool({ connectionString });
  const counts = {
    postingsConsidered: 0,
    userJobsInserted: 0,
    applicationsRepointed: 0,
    applicationsOrphaned: 0,
    preferencesNulled: 0
  };

  try {
    const tableExists = async (name: string): Promise<boolean> => {
      const result = await pool.query<{ exists: boolean }>(
        `SELECT to_regclass($1) IS NOT NULL AS exists`,
        [`public.${name}`]
      );
      return result.rows[0]?.exists ?? false;
    };
    const columnExists = async (table: string, column: string): Promise<boolean> => {
      const result = await pool.query<{ exists: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
         ) AS exists`,
        [table, column]
      );
      return result.rows[0]?.exists ?? false;
    };

    // Shared catalog and legacy columns may already be dropped by
    // 20260905140000_drop_shared_job_catalog — then there is nothing to do.
    const hasCatalog = await tableExists("job_posting");
    const hasLegacyPrefColumns = await columnExists("job_preference", "title_id");
    if (!hasCatalog && !hasLegacyPrefColumns) {
      console.log(
        "[migrate-postings] job_posting and legacy preference columns already dropped — nothing to migrate"
      );
      return;
    }

    if (!hasCatalog) {
      console.log("[migrate-postings] job_posting already dropped — skipping application repoint");
    }

    // 1. Applications still pointed at the shared catalog (with the join info
    //    needed to derive each posting's legacy slug).
    const joined = hasCatalog
      ? await pool.query<JoinRow>(
          `SELECT a.id, a.user_id, a.job_id, a.posting_id, jp.adapter_id, jp.external_id
           FROM application a
           JOIN job_posting jp ON a.posting_id = jp.id
           WHERE a.posting_id IS NOT NULL`
        )
      : { rows: [] as JoinRow[] };

    // 2. Copy each distinct referenced posting into user_job under "legacy"
    //    provenance. Hiring region is dropped (no user_job column).
    const postingIds = [...new Set(joined.rows.map((row) => row.posting_id))];
    const slugByPostingId = new Map<string, string>();
    for (const jp of joined.rows) {
      slugByPostingId.set(jp.posting_id, slugFor(jp));
    }
    counts.postingsConsidered = postingIds.length;

    if (postingIds.length > 0) {
      const postings = await pool.query<PostingRow>(
        `SELECT id, adapter_id, external_id, listing_url, title, company_name,
                company_logo_url, location, work_mode, employment_type,
                experience_years_min, salary_min, salary_max, salary_currency,
                skills, description, source_platform, posted_at,
                first_seen_at, last_seen_at
         FROM job_posting
         WHERE id = ANY($1::text[])`,
        [postingIds]
      );

      const userIdsByPostingId = new Map<string, Set<string>>();
      for (const row of joined.rows) {
        const users = userIdsByPostingId.get(row.posting_id) ?? new Set<string>();
        users.add(row.user_id);
        userIdsByPostingId.set(row.posting_id, users);
      }

      for (const jp of postings.rows) {
        const slug = slugFor(jp);
        for (const userId of userIdsByPostingId.get(jp.id) ?? []) {
          const result = await pool.query(
            `INSERT INTO user_job (
               id, user_id, freehire_slug, title, company_name, company_logo_url,
               listing_url, location, work_mode, employment_type,
               experience_years_min, salary_min, salary_max, salary_currency,
               skills, description, source, posted_at,
               query_hash, query_filters, first_seen_at, last_seen_at
             )
             VALUES (
               $1, $2, $3, $4, $5, $6,
               $7, $8, $9, $10,
               $11, $12, $13, $14,
               $15::jsonb, $16, $17, $18,
               'legacy', '{"legacy":true}'::jsonb,
               $19, $20
             )
             ON CONFLICT (user_id, freehire_slug) DO NOTHING`,
            [
              crypto.randomUUID(),
              userId,
              slug,
              jp.title,
              jp.company_name,
              jp.company_logo_url,
              jp.listing_url,
              jp.location,
              jp.work_mode,
              jp.employment_type,
              jp.experience_years_min,
              jp.salary_min,
              jp.salary_max,
              jp.salary_currency,
              JSON.stringify(jp.skills ?? []),
              jp.description,
              jp.source_platform,
              jp.posted_at,
              jp.first_seen_at,
              jp.last_seen_at
            ]
          );
          counts.userJobsInserted += result.rowCount ?? 0;
        }
      }

      // 3. Repoint each application at its matching user_job row. The
      //    post-update SELECT is the source of truth: repointed only when
      //    job_id actually became non-null; orphan only when it is still
      //    null (no user_job row matched).
      for (const app of joined.rows) {
        if (app.job_id !== null) continue;
        const slug = slugByPostingId.get(app.posting_id);
        if (!slug) continue;
        await pool.query(
          `UPDATE application
           SET job_id = (
             SELECT id FROM user_job
             WHERE user_id = $1 AND freehire_slug = $2
           )
           WHERE id = $3 AND job_id IS NULL`,
          [app.user_id, slug, app.id]
        );
        const after = await pool.query<{ job_id: string | null }>(
          `SELECT job_id FROM application WHERE id = $1`,
          [app.id]
        );
        if (after.rows[0]?.job_id != null) {
          counts.applicationsRepointed += 1;
        } else {
          counts.applicationsOrphaned += 1;
        }
      }
    }

    // 4. Reset the NULLABLE legacy preference columns. NOT NULL DEFAULT
    //    columns (locations, remote_regions, exclude_keywords, jobs_per_run,
    //    work_modes, role_keywords) are removed by the dropping migration,
    //    which completes the reset.
    if (hasLegacyPrefColumns) {
      const prefs = await pool.query(
        `UPDATE job_preference
         SET title_id = NULL, custom_title = NULL, level_floor = NULL
         WHERE title_id IS NOT NULL OR custom_title IS NOT NULL OR level_floor IS NOT NULL`
      );
      counts.preferencesNulled = prefs.rowCount ?? 0;
    }

    console.log(
      `[migrate-postings] postingsConsidered=${counts.postingsConsidered} ` +
        `userJobsInserted=${counts.userJobsInserted} ` +
        `applicationsRepointed=${counts.applicationsRepointed} ` +
        `applicationsOrphaned=${counts.applicationsOrphaned} ` +
        `preferencesNulled=${counts.preferencesNulled}`
    );
    if (counts.applicationsOrphaned !== 0) {
      console.error(
        `[migrate-postings] WARNING: ${counts.applicationsOrphaned} application(s) ` +
          `left with NULL job_id (no matching user_job row)`
      );
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[migrate-postings] failed:", error);
  process.exit(1);
});
