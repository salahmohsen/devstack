import { isInboxExpired, LIVENESS_TICK_BATCH, USER_JOB_TTL_MS } from "@tsu-stack/core";
import {
  applicationActivityRepository,
  applicationRepository,
  userJobRepository,
  type ApplicationEntity
} from "@tsu-stack/db";

import { runSilenceTick } from "#@/lib/application/silence-tick";

/**
 * Inbox tick (12h): TTL dismissal + silence nudges + stale `user_job` purge.
 * No HTTP probes — postings are gone; freehire rows are re-fetched fresh.
 */
export async function runInboxTick(now = new Date()): Promise<{
  dismissedExpired: number;
  purged: number;
}> {
  const expired = await applicationRepository.listInboxExpired(now, LIVENESS_TICK_BATCH);
  let dismissedExpired = 0;
  for (const row of expired) {
    if (!isInboxExpired({ inboxExpiresAt: row.inboxExpiresAt, now })) continue;
    if (await dismissInbox(row, "ttl")) dismissedExpired += 1;
  }

  const purged = await userJobRepository.purgeStale(new Date(now.getTime() - USER_JOB_TTL_MS));

  await runSilenceTick(now);

  return { dismissedExpired, purged };
}

async function dismissInbox(row: ApplicationEntity, via: "ttl"): Promise<boolean> {
  const updated = await applicationRepository.setTrackingStatus(
    row.id,
    row.userId,
    "dismissed",
    "inbox"
  );
  if (!updated) return false;
  await applicationActivityRepository.append({
    userId: row.userId,
    applicationId: row.id,
    kind: "dismissed",
    metadata: { via }
  });
  return true;
}
