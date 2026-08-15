import {
  fetchPublicHttpStatus,
  inboxLivenessDueAt,
  isInboxExpired,
  LIVENESS_TICK_BATCH,
  type FetchPublicHttpStatusResult
} from "@tsu-stack/core";
import {
  applicationActivityRepository,
  applicationRepository,
  jobPostingRepository,
  type ApplicationEntity,
  type JobPostingEntity
} from "@tsu-stack/db";

const GONE_STATUSES = new Set([404, 410]);
const PROBE_CONCURRENCY = 5;
const FREEHIRE_JOB_API = (externalId: string) =>
  `https://freehire.me/api/v1/jobs/${encodeURIComponent(externalId)}`;

export async function runInboxLivenessTick(now = new Date()): Promise<{
  checked: number;
  closed: number;
  dismissedExpired: number;
}> {
  await dismissClosedListingInbox();

  const due = (await applicationRepository.listInboxDueLiveness(now, LIVENESS_TICK_BATCH)).filter(
    (row) => inboxLivenessDueAt(row.createdAt).getTime() <= now.getTime()
  );

  const postingIds = uniqueIds(due.map((row) => row.postingId));
  const postingById = new Map(
    (await jobPostingRepository.findByIds(postingIds)).map((row) => [row.id, row])
  );

  const targets = uniqueTargets(due, postingById);
  const goneUrls = new Set<string>();
  let closed = 0;

  const probes = await mapPool(targets, PROBE_CONCURRENCY, async (target) => {
    const gone = await listingIsClosed(target);
    return { target, gone };
  });

  for (const { target, gone } of probes) {
    if (!gone) continue;
    closed += 1;
    if (target.postingId) {
      await jobPostingRepository.markClosed(target.postingId, now);
    } else {
      goneUrls.add(target.listingUrl);
    }
  }

  await dismissClosedListingInbox();
  for (const row of due) {
    if (row.trackingStatus !== "inbox" || !row.url || !goneUrls.has(row.url)) continue;
    await dismissInbox(row, "listing_closed");
  }

  const expired = await applicationRepository.listInboxExpired(now, LIVENESS_TICK_BATCH);
  let dismissedExpired = 0;
  for (const row of expired) {
    if (!isInboxExpired({ inboxExpiresAt: row.inboxExpiresAt, now })) continue;
    if (await dismissInbox(row, "ttl")) dismissedExpired += 1;
  }

  return { checked: targets.length, closed, dismissedExpired };
}

type LivenessTarget = {
  listingUrl: string;
  postingId: string | null;
  adapterId: string | null;
  externalId: string | null;
};

function uniqueTargets(
  due: ApplicationEntity[],
  postingById: Map<string, JobPostingEntity>
): LivenessTarget[] {
  const seen = new Set<string>();
  const targets: LivenessTarget[] = [];
  for (const row of due) {
    const posting = row.postingId ? (postingById.get(row.postingId) ?? null) : null;
    const listingUrl = posting?.listingUrl ?? row.url;
    if (!listingUrl) continue;
    const key = posting ? `posting:${posting.id}` : `url:${listingUrl}`;
    if (seen.has(key)) continue;
    seen.add(key);
    targets.push({
      listingUrl,
      postingId: posting?.id ?? null,
      adapterId: posting?.adapterId ?? null,
      externalId: posting?.externalId ?? null
    });
  }
  return targets;
}

function uniqueIds(ids: Array<string | null>): string[] {
  return [...new Set(ids.filter((id): id is string => id != null))];
}

async function listingIsClosed(target: LivenessTarget): Promise<boolean> {
  const listing = await probeListingUrl(target.listingUrl);
  if (listing.status != null && GONE_STATUSES.has(listing.status)) return true;

  if (target.adapterId === "freehire" && target.externalId && !listing.ok) {
    const api = await fetchPublicHttpStatus(FREEHIRE_JOB_API(target.externalId), { method: "GET" });
    if (api.status != null && GONE_STATUSES.has(api.status)) return true;
  }
  return false;
}

async function probeListingUrl(url: string): Promise<FetchPublicHttpStatusResult> {
  const head = await fetchPublicHttpStatus(url, { method: "HEAD" });
  if ((head.status != null && GONE_STATUSES.has(head.status)) || head.ok) return head;
  return fetchPublicHttpStatus(url, { method: "GET" });
}

async function dismissClosedListingInbox(): Promise<void> {
  const rows = await applicationRepository.listInboxWithClosedPosting(LIVENESS_TICK_BATCH);
  for (const row of rows) {
    await dismissInbox(row, "listing_closed");
  }
}

async function dismissInbox(
  row: ApplicationEntity,
  via: "listing_closed" | "ttl"
): Promise<boolean> {
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

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    out.push(...(await Promise.all(chunk.map(fn))));
  }
  return out;
}
