/**
 * Tag job-alert mails as job_notifier and run harvest.
 *
 * From worktree root:
 *   pnpm dotenvx run -f ./packages/env/.env -- pnpm exec tsx \
 *     --tsconfig apps/server/tsconfig.json \
 *     apps/server/scripts/reharvest-job-notifiers.mts
 */

import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { isJobAlertDigestMail } from "@tsu-stack/core";

import { runMailJobHarvest } from "#@/queues/run-mail-job-harvest";

const require = createRequire(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../packages/db/package.json")
);
const pg = require("pg") as typeof import("pg");

type Row = {
  id: string;
  user_id: string;
  from_email: string;
  from_name: string;
  subject: string;
  preview: string;
  body_text: string;
  labels: string[] | null;
};

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL missing");

  const pool = new pg.Pool({ connectionString: databaseUrl });

  const { rows } = await pool.query<Row>(`
    SELECT id, user_id, from_email, from_name, subject, preview, body_text, labels
    FROM mail_message
    WHERE purpose = 'career'
      AND (
        'job_notifier' = ANY(COALESCE(labels, ARRAY[]::text[]))
        OR from_email ILIKE '%jobalerts-noreply@linkedin.com%'
        OR from_email ILIKE '%jobs-noreply@linkedin.com%'
        OR (from_email ILIKE '%notify-noreply@google.com%' AND subject ILIKE '%job%')
        OR from_email ILIKE '%indeed%'
      )
    ORDER BY received_at DESC
  `);

  console.log(`SQL candidates: ${rows.length}`);

  let tagged = 0;
  let harvested = 0;
  let createdTotal = 0;
  let skipped = 0;

  for (const row of rows) {
    const statusy = /application (was )?sent|your application to/i.test(row.subject ?? "");
    const already = (row.labels ?? []).includes("job_notifier");
    const digest = isJobAlertDigestMail({
      fromEmail: row.from_email,
      fromName: row.from_name,
      subject: row.subject,
      preview: row.preview,
      bodyText: row.body_text
    });

    if (statusy && !already) {
      skipped += 1;
      continue;
    }
    if (!digest && !already) {
      skipped += 1;
      continue;
    }

    const nextLabels = Array.from(new Set([...(row.labels ?? []), "job_notifier"]));
    await pool.query(
      `UPDATE mail_message
       SET labels = $1::text[],
           classified_at = COALESCE(classified_at, NOW())
       WHERE id = $2 AND user_id = $3`,
      [nextLabels, row.id, row.user_id]
    );
    tagged += 1;

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
      {
        tagged,
        harvested,
        createdTotal,
        skipped,
        applicationsInDb: apps.rows[0]?.n
      },
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
