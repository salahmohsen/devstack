/**
 * Hard-delete all applications (ops / local re-seed).
 *
 *   pnpm dotenvx run -f ./packages/env/.env -- \
 *     ./apps/server/node_modules/.bin/tsx --tsconfig apps/server/tsconfig.json \
 *     apps/server/scripts/purge-all-applications.mts
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../packages/db/package.json")
);
const pg = require("pg") as typeof import("pg");

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL missing");

  const pool = new pg.Pool({ connectionString: databaseUrl });
  const before = await pool.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM application`);
  console.log("applications before:", before.rows[0]?.n);

  await pool.query(
    `UPDATE mail_message SET application_id = NULL WHERE application_id IS NOT NULL`
  );
  try {
    await pool.query(
      `UPDATE mail_crm_apply SET undone_at = COALESCE(undone_at, NOW()) WHERE application_id IS NOT NULL AND undone_at IS NULL`
    );
  } catch (e) {
    console.log("mail_crm_apply skip:", String(e).slice(0, 100));
  }

  const deleted = await pool.query(`DELETE FROM application RETURNING id`);
  console.log("deleted applications:", deleted.rowCount);

  const after = await pool.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM application`);
  const mails = await pool.query<{ n: number }>(`
    SELECT COUNT(*)::int AS n FROM mail_message
    WHERE purpose = 'career'
      AND (
        'job_notifier' = ANY(COALESCE(labels, ARRAY[]::text[]))
        OR from_email ILIKE '%linkedin.com%'
        OR from_email ILIKE '%jackandjill.ai%'
        OR from_email ILIKE '%indeed%'
        OR (from_email ILIKE '%notify-noreply@google.com%' AND subject ILIKE '%job%')
      )
  `);
  console.log(
    JSON.stringify(
      { applicationsAfter: after.rows[0]?.n, harvestCandidates: mails.rows[0]?.n },
      null,
      2
    )
  );
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
