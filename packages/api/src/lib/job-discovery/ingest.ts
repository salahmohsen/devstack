import Redis from "ioredis";

import {
  ingestQueryKey,
  JOB_ADAPTER_IDS,
  JOB_TITLE_PACK_IDS,
  TITLE_PACKS,
  type JobAdapterId,
  type JobPreference,
  type JobSourceAdapter,
  type JobTitleId,
  type JobTitlePackId,
  type NormalizedListing,
  type WorkMode
} from "@tsu-stack/core";
import { jobPostingRepository } from "@tsu-stack/db";
import { ENV_SERVER } from "@tsu-stack/env/server/env";

import { jobSourceAdapters } from "#@/lib/job-discovery/adapters/registry";
import { listingContentHash } from "#@/lib/job-discovery/content-hash";

const SEARCH_PAGE_SIZE = 50;
const SEARCH_MAX_PAGES = 3;
const FEED_MAX_PAGES = 3;
const SEARCH_UPSERT_CAP = 80;
const REMOTIVE_DAILY_CAP = 4;
const REMOTIVE_TTL_SECONDS = 48 * 60 * 60;
const MAX_SEARCH_Q_CHARS = 80;
const PACK_Q_KEYWORD_LIMIT = 4;
const REDIS_STORE_KEY = "__tsu_stack_job_discovery_remotive_redis__";
const REDIS_CONNECT_TIMEOUT_MS = 2_000;

type RedisStore = { ready?: Promise<Redis | null> };

function redisStore(): RedisStore {
  const g = globalThis as typeof globalThis & Record<string, RedisStore | undefined>;
  g[REDIS_STORE_KEY] ??= {};
  return g[REDIS_STORE_KEY]!;
}

function remotiveBudgetKey(now = new Date()): string {
  return `remotive:${now.toISOString().slice(0, 10)}`;
}

function isJobTitlePackId(value: string): value is JobTitlePackId {
  return (JOB_TITLE_PACK_IDS as readonly string[]).includes(value);
}

async function connectRemotiveRedis(url: string): Promise<Redis | null> {
  const client = new Redis(url, {
    enableOfflineQueue: false,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: REDIS_CONNECT_TIMEOUT_MS,
    commandTimeout: REDIS_CONNECT_TIMEOUT_MS
  });
  client.on("error", () => {});
  try {
    // Wait for ready/ping — offline-queue-off commands issued during handshake reject
    // and would skip Remotive even when Redis is up.
    await Promise.race([
      client.connect().then(() => client.ping()),
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("remotive redis connect timeout")),
          REDIS_CONNECT_TIMEOUT_MS
        );
      })
    ]);
    return client;
  } catch {
    client.disconnect();
    return null;
  }
}

async function getRedis(): Promise<Redis | null> {
  const store = redisStore();
  if (!store.ready) {
    const url = ENV_SERVER.REDIS_URL?.trim();
    store.ready = url ? connectRemotiveRedis(url) : Promise.resolve(null);
  }
  return store.ready;
}

/** Remaining Remotive calls today. 0 when Redis is unset or down. */
export async function getRemotiveCallsLeft(): Promise<number> {
  const redis = await getRedis();
  if (!redis) return 0;
  try {
    const raw = await redis.get(remotiveBudgetKey());
    const used = raw == null ? 0 : Number.parseInt(raw, 10);
    if (!Number.isFinite(used) || used < 0) return 0;
    return Math.max(0, REMOTIVE_DAILY_CAP - used);
  } catch {
    return 0;
  }
}

async function consumeRemotiveCall(): Promise<boolean> {
  const redis = await getRedis();
  if (!redis) return false;
  try {
    const key = remotiveBudgetKey();
    const n = await redis.incr(key);
    if (n === 1) await redis.expire(key, REMOTIVE_TTL_SECONDS);
    return n <= REMOTIVE_DAILY_CAP;
  } catch {
    return false;
  }
}

export function planIngestQueries(
  prefs: Array<{ titleId: JobTitleId | null; customTitle: string | null; roleKeywords: string[] }>
): string[] {
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const pref of prefs) {
    const key = ingestQueryKey(pref);
    if (key == null || seen.has(key)) continue;
    seen.add(key);
    keys.push(key);
  }
  return keys;
}

/** pack:frontend → pack keywords; custom:k8s|sre → "k8s sre". */
export function searchQueryFromKey(queryKey: string): string | null {
  if (queryKey.startsWith("pack:")) {
    const id = queryKey.slice("pack:".length);
    if (!isJobTitlePackId(id)) return null;
    const keywords = TITLE_PACKS[id].keywords;
    const joined = keywords.join(" ");
    return joined.length > MAX_SEARCH_Q_CHARS
      ? keywords.slice(0, PACK_Q_KEYWORD_LIMIT).join(" ")
      : joined;
  }
  if (queryKey.startsWith("custom:")) {
    const parts = queryKey
      .slice("custom:".length)
      .split("|")
      .map((part) => part.trim())
      .filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : null;
  }
  return null;
}

function resolveAdapters(
  override?: Partial<Record<JobAdapterId, JobSourceAdapter>>
): JobSourceAdapter[] {
  if (override) {
    return JOB_ADAPTER_IDS.map((id) => override[id]).filter(
      (adapter): adapter is JobSourceAdapter => adapter != null
    );
  }
  return JOB_ADAPTER_IDS.map((id) => jobSourceAdapters[id]);
}

function toUpsertInput(listing: NormalizedListing) {
  return {
    adapterId: listing.adapterId,
    externalId: listing.externalId,
    listingUrl: listing.listingUrl,
    title: listing.title,
    companyName: listing.companyName,
    location: listing.location,
    workMode: listing.workMode,
    ...(listing.hiringRegion != null ? { hiringRegion: listing.hiringRegion } : {}),
    ...(listing.employmentType != null ? { employmentType: listing.employmentType } : {}),
    salaryMin: listing.salaryMin,
    salaryMax: listing.salaryMax,
    salaryCurrency: listing.salaryCurrency,
    skills: listing.skills,
    description: listing.description,
    sourcePlatform: listing.sourcePlatform,
    contentHash: listingContentHash(listing),
    postedAt: listing.postedAt
  };
}

async function upsertListings(listings: NormalizedListing[]): Promise<number> {
  let upserted = 0;
  for (const listing of listings) {
    try {
      await jobPostingRepository.upsert(toUpsertInput(listing));
      upserted += 1;
    } catch {
      // one bad row must not abort the page
    }
  }
  return upserted;
}

function pageCap(adapter: JobSourceAdapter): number {
  if (adapter.id === "remoteok" || adapter.id === "remotive") return 1;
  return adapter.capabilities.includes("feed") ? FEED_MAX_PAGES : SEARCH_MAX_PAGES;
}

async function ingestAdapter(
  adapter: JobSourceAdapter,
  input: { q?: string; workMode?: WorkMode | null },
  opts: { maxPages: number; stopAt?: number }
): Promise<number> {
  let upserted = 0;
  try {
    for (let page = 1; page <= opts.maxPages; page++) {
      let listings: NormalizedListing[] = [];
      try {
        listings = await adapter.fetch({
          q: input.q,
          workMode: input.workMode,
          page,
          limit: SEARCH_PAGE_SIZE
        });
      } catch {
        break;
      }
      if (listings.length === 0) break;
      upserted += await upsertListings(listings);
      if (opts.stopAt != null && upserted >= opts.stopAt) break;
    }
  } catch {
    // one failed adapter must not abort the rest
  }
  return upserted;
}

export async function ingestQuery(input: {
  queryKey: string;
  workMode?: WorkMode | null;
  remotiveCallsLeft: number;
  adapters?: Partial<Record<JobAdapterId, JobSourceAdapter>>;
}): Promise<{ upserted: number; remotiveUsed: number }> {
  const q = searchQueryFromKey(input.queryKey);
  if (!q) return { upserted: 0, remotiveUsed: 0 };

  const adapters = resolveAdapters(input.adapters);
  let upserted = 0;
  let remotiveUsed = 0;
  const fetchInput = { q, workMode: input.workMode ?? null };

  const searchAdapters = adapters.filter((adapter) => adapter.capabilities.includes("search"));
  const remotive = searchAdapters.find((adapter) => adapter.id === "remotive");
  const parallelSearch = searchAdapters.filter((adapter) => adapter.id !== "remotive");

  const parallelCounts = await Promise.all(
    parallelSearch.map((adapter) =>
      ingestAdapter(adapter, fetchInput, {
        maxPages: pageCap(adapter),
        stopAt: SEARCH_UPSERT_CAP
      })
    )
  );
  upserted += parallelCounts.reduce((sum, n) => sum + n, 0);

  if (remotive && input.remotiveCallsLeft > 0) {
    const reserved = input.adapters != null ? true : await consumeRemotiveCall();
    if (reserved) {
      remotiveUsed += 1;
      upserted += await ingestAdapter(remotive, fetchInput, {
        maxPages: pageCap(remotive),
        stopAt: SEARCH_UPSERT_CAP
      });
    }
  }

  return { upserted, remotiveUsed };
}

export async function ingestFeeds(): Promise<{ upserted: number }> {
  const feeds = resolveAdapters().filter((adapter) => adapter.capabilities.includes("feed"));
  const counts = await Promise.all(
    feeds.map((adapter) => ingestAdapter(adapter, {}, { maxPages: pageCap(adapter) }))
  );
  return { upserted: counts.reduce((sum, n) => sum + n, 0) };
}

export async function ingestForUserQuery(prefs: JobPreference): Promise<{ upserted: number }> {
  const queryKey = ingestQueryKey(prefs);
  if (!queryKey) return { upserted: 0 };
  const remotiveCallsLeft = await getRemotiveCallsLeft();
  const workMode = prefs.workModes.length === 1 ? prefs.workModes[0] : null;
  const result = await ingestQuery({ queryKey, workMode, remotiveCallsLeft });
  return { upserted: result.upserted };
}
