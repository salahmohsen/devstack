/**
 * Force job_notifier + run AI harvest for Jack and Jill mails.
 * Classification intent is AI-owned in production; this script is an ops re-run helper.
 *
 *   pnpm dotenvx run -f ./packages/env/.env -- \
 *     ./apps/server/node_modules/.bin/tsx --tsconfig apps/server/tsconfig.json \
 *     apps/server/scripts/reharvest-jackandjill.mts
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
  subject: string;
  labels: string[] | null;
};

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL missing");

  const pool = new pg.Pool({ connectionString: databaseUrl });

  const { rows } = await pool.query<Row>(`
    SELECT id, user_id, subject, labels
    FROM mail_message
    WHERE purpose = 'career'
      AND from_email ILIKE '%@jackandjill.ai%'
    ORDER BY received_at DESC
  `);

  console.log(`Jack and Jill mails: ${rows.length}`);

  let harvested = 0;
  let createdTotal = 0;
  let skipped = 0;

  for (const row of rows) {
    // Ops re-run: treat all non-onboarding J&J career mails as harvest candidates.
    // Onboarding is left to AI classify in production; here we skip obvious welcome subjects.
    if (/kick things off|good to have you/i.test(row.subject ?? "")) {
      skipped += 1;
      console.log(JSON.stringify({ id: row.id.slice(0, 8), subject: row.subject, skipped: true }));
      continue;
    }

    const cleaned = (row.labels ?? []).filter(
      (l) => !["application_status", "interview", "application", "offer", "recruiter"].includes(l)
    );
    const nextLabels = Array.from(new Set([...cleaned, "job_notifier"]));

    await pool.query(
      `UPDATE mail_message
       SET labels = $1::text[],
           classified_at = COALESCE(classified_at, NOW()),
           application_id = NULL
       WHERE id = $2 AND user_id = $3`,
      [nextLabels, row.id, row.user_id]
    );
    await pool.query(
      `UPDATE mail_crm_apply SET undone_at = NOW()
       WHERE message_id = $1 AND user_id = $2 AND undone_at IS NULL`,
      [row.id, row.user_id]
    );

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

  console.log(JSON.stringify({ harvested, createdTotal, skipped }, null, 2));
  await pool.end();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
