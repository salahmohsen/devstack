import { and, eq, exists, gt, or, sql, type SQL } from "drizzle-orm";

import { DISCOVERY_ACTIVITY_WINDOW_MS } from "@tsu-stack/core";
import { getDb, type WsDb } from "@tsu-stack/db";
import { jobPreference, session } from "@tsu-stack/db/schema";

/** Inclusive activity window start: now minus the 7-day window. */
export function activityWindowStart(now: Date): Date {
  return new Date(now.getTime() - DISCOVERY_ACTIVITY_WINDOW_MS);
}

/**
 * Cron-enrollment predicate: saved role facets (q keywords or categories) AND
 * activity within the 7-day window (session `updatedAt` bumps on auth use).
 * Manual find-now bypasses this predicate and re-enrolls.
 * Pure in `db` so tests can render it through Drizzle's dialect.
 */
export function enrolledUsersPredicate(db: WsDb, windowStart: Date): SQL {
  return and(
    or(
      sql`jsonb_array_length(coalesce(${jobPreference.roleKeywords}, '[]'::jsonb)) > 0`,
      sql`jsonb_array_length(coalesce(${jobPreference.categories}, '[]'::jsonb)) > 0`
    ),
    exists(
      db
        .select({ one: sql`1` })
        .from(session)
        .where(and(eq(session.userId, jobPreference.userId), gt(session.updatedAt, windowStart)))
    )
  )!;
}

export async function listEnrolledUserIds(now: Date): Promise<string[]> {
  const rows = await getDb()
    .selectDistinct({ userId: jobPreference.userId })
    .from(jobPreference)
    .where(enrolledUsersPredicate(getDb(), activityWindowStart(now)));
  return rows.map((row) => row.userId);
}
