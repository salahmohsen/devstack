/**
 * Run AI job harvest for mails already labeled job_notifier (or common alert senders).
 * Production labeling is AI classify + mail-classification skill; this is an ops re-run tool.
 *
 *   pnpm dotenvx run -f ./packages/env/.env -- \
 *     ./apps/server/node_modules/.bin/tsx --tsconfig apps/server/tsconfig.json \
 *     apps/server/scripts/reharvest-job-notifiers.mts
 */

import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runMailJobHarvest } from "#@/queues/run-mail-job-harvest";

const require = createRequire(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../packages/db/package.json")
);
const pg = require("pg") as typeof import("pg");

type Row = {
  id: string;
  user_id: string;
  from_email: string;
  subject: string;
  labels: string[] | null;
};

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL missing");

  const pool = new pg.Pool({ connectionString: databaseUrl });

  // Prefer AI-applied job_notifier labels; include known alert senders for backfill.
  const { rows } = await pool.query<Row>(`
    SELECT id, user_id, from_email, subject, labels
    FROM mail_message
    WHERE purpose = 'career'
      AND (
        'job_notifier' = ANY(COALESCE(labels, ARRAY[]::text[]))
        OR from_email ILIKE '%jobalerts-noreply@linkedin.com%'
        OR from_email ILIKE '%jobs-noreply@linkedin.com%'
        OR (from_email ILIKE '%notify-noreply@google.com%' AND subject ILIKE '%job%')
        OR from_email ILIKE '%indeed%'
        OR from_email ILIKE '%@jackandjill.ai%'
      )
    ORDER BY received_at DESC
  `);

  console.log(`SQL candidates: ${rows.length}`);

  let tagged = 0;
  let harvested = 0;
  let createdTotal = 0;
  let skipped = 0;

  for (const row of rows) {
    if (/application (was )?sent|your application to/i.test(row.subject ?? "")) {
      skipped += 1;
      continue;
    }
    if (/kick things off|good to have you/i.test(row.subject ?? "")) {
      skipped += 1;
      continue;
    }

    const already = (row.labels ?? []).includes("job_notifier");
    if (!already) {
      const nextLabels = Array.from(new Set([...(row.labels ?? []), "job_notifier"]));
      await pool.query(
        `UPDATE mail_message
         SET labels = $1::text[],
             classified_at = COALESCE(classified_at, NOW())
         WHERE id = $2 AND user_id = $3`,
        [nextLabels, row.id, row.user_id]
      );
      tagged += 1;
    }

    const harvest = await runMailJobHarvest({
      messageId: row.id,
      userId: row.user_id
    });
    harvested += 1;
    createdTotal += harvest.created;
    console.log(
      JSON.stringify({
        id: row.id.slice(0, 8),
        subject: (row.subject ?? "").slice(0, 55),
        candidates: harvest.candidatesFound,
        created: harvest.created,
        lowMatch: harvest.skippedLowMatch,
        dup: harvest.skippedDuplicate
      })
    );
  }

  const apps = await pool.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM application`);
  console.log(
    JSON.stringify(
      { tagged, harvested, createdTotal, skipped, applicationsInDb: apps.rows[0]?.n },
      null,
      2
    )
  );

  await pool.end();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
