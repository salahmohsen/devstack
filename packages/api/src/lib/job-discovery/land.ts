import {
  applyZeroDollarCandidate,
  computeLandBudget,
  dailyAiAttemptCap,
  decideTwoAxis,
  hasValidDiscoveryTitle,
  isThinJobDescription,
  MAX_OPEN_INBOX,
  scoreCatalogAgainstPreference,
  WorkModeSchema,
  type TwoAxisPrefs,
  type WorkMode
} from "@tsu-stack/core";
import {
  applicationRepository,
  jobPostingRepository,
  userJobAiBudgetRepository,
  type JobPostingEntity
} from "@tsu-stack/db";

import { loadJobPreference } from "#@/lib/application/load-job-preference";
import { requestJobInboxAi } from "#@/lib/job-discovery/enqueue";
import { hydratePostingIfNeeded } from "#@/lib/job-discovery/hydrate";
import { resolveRuntimeAiCredentials } from "#@/lib/settings/resolve-runtime-ai";

export type DiscoveryLandReason = "ok" | "title_required" | "inbox_full" | "empty_shelf";

export type DiscoveryLandResult = {
  landed: number;
  reason: DiscoveryLandReason;
};

function utcDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function asWorkMode(value: string | null | undefined): WorkMode | null {
  const parsed = WorkModeSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function applicationLocation(
  hydrateLocation: string | null,
  catalogLocation: string | null
): string | null {
  const fromHydrate = hydrateLocation?.trim() ?? "";
  if (fromHydrate.length > 0) return fromHydrate;
  const fromCatalog = catalogLocation?.trim() ?? "";
  return fromCatalog.length > 0 ? fromCatalog : null;
}

/** Highest cheap score first, then take `toLand`. Pure helper for land selection tests. */
export function selectListingsToLand<T extends { score: number }>(
  scored: readonly T[],
  toLand: number
): T[] {
  if (toLand <= 0) return [];
  return [...scored].toSorted((a, b) => b.score - a.score).slice(0, toLand);
}

/**
 * Extra pass may enqueue this many NEW evaluate jobs.
 * `landUpTo` is incremental (reserved slots this call). Passing
 * `alreadyLanded + extraBudget` reintroduces the sequential cumulative
 * target and overshoots N / 50 under a parallel pool.
 */
export function extraPassCreateLimit(extraBudget: number): number {
  return Math.max(0, extraBudget);
}

/**
 * $0 extract + two-axis gate. `created` means enqueue evaluate — never an inbox row.
 * Two-axis drop / unknown mode → created=false (no enqueue, no stub).
 */
export function decideLandCandidate(input: {
  workMode: WorkMode | null;
  hiringRegion: string | null;
  location: string | null;
  description: string | null;
  prefs: TwoAxisPrefs;
}): { created: boolean; reason: string } {
  const candidate = applyZeroDollarCandidate({
    workMode: input.workMode,
    hiringRegion: input.hiringRegion,
    location: input.location,
    employmentType: null,
    description: input.description,
    skills: []
  });
  const decision = decideTwoAxis({
    workMode: candidate.workMode,
    hiringRegion: candidate.hiringRegion,
    location: candidate.location,
    prefs: input.prefs
  });
  return { created: decision.action === "pass", reason: decision.reason };
}

type ScoredPosting = {
  posting: JobPostingEntity;
  score: number;
  reasons: string[];
};

function compareScoredPostings(a: ScoredPosting, b: ScoredPosting): number {
  if (b.score !== a.score) return b.score - a.score;
  const aPosted = a.posting.postedAt?.getTime() ?? 0;
  const bPosted = b.posting.postedAt?.getTime() ?? 0;
  return bPosted - aPosted;
}

async function remainingLandBudget(input: {
  userId: string;
  runId: string;
  jobsPerRun: number;
  hasAiKey: boolean;
}): Promise<number> {
  const [openInbox, inboxThisRun, remaining] = await Promise.all([
    applicationRepository.countByUserIdAndTrackingStatus(input.userId, "inbox"),
    applicationRepository.countInboxThisRun(input.userId, input.runId),
    userJobAiBudgetRepository.remainingAttempts(
      input.userId,
      utcDay(),
      dailyAiAttemptCap(input.jobsPerRun)
    )
  ]);
  return computeLandBudget({
    jobsPerRun: input.jobsPerRun,
    openInbox,
    inboxThisRun,
    remainingDailyAiAttempts: remaining,
    hasAiKey: input.hasAiKey
  });
}

/** Hydrate + $0 two-axis. Pass enqueues evaluate — never createIfAbsentByUrl. */
async function enqueueEvaluateIfPassed(input: {
  userId: string;
  runId: string;
  candidate: ScoredPosting;
  hasAiKey: boolean;
  prefs: TwoAxisPrefs;
}): Promise<boolean> {
  const hydrate = await hydratePostingIfNeeded(input.candidate.posting.id);
  const posting = await jobPostingRepository.findById(input.candidate.posting.id);
  if (!posting || posting.closedAt != null || hydrate.listingClosed) return false;

  const description = hydrate.description ?? posting.description;
  // With a BYO key, N is AI-passed keepers. Do not spend an evaluate on a thin JD.
  if (input.hasAiKey && isThinJobDescription(description)) return false;

  const gate = decideLandCandidate({
    workMode: asWorkMode(hydrate.workMode ?? posting.workMode),
    hiringRegion: hydrate.hiringRegion ?? posting.hiringRegion,
    location: applicationLocation(hydrate.location, posting.location),
    description,
    prefs: input.prefs
  });
  if (!gate.created) return false;

  return requestJobInboxAi({
    userId: input.userId,
    runId: input.runId,
    postingId: posting.id
  });
}

export async function runDiscoveryLand(input: {
  userId: string;
  runId: string;
}): Promise<DiscoveryLandResult> {
  const [prefs, llm] = await Promise.all([
    loadJobPreference(input.userId),
    resolveRuntimeAiCredentials(input.userId, "scorer")
  ]);

  if (
    !hasValidDiscoveryTitle({
      titleId: prefs.titleId,
      customTitle: prefs.customTitle,
      roleKeywords: prefs.roleKeywords
    })
  ) {
    return { landed: 0, reason: "title_required" };
  }

  const hasAiKey = Boolean(llm.apiKey?.trim());
  const openInbox = await applicationRepository.countByUserIdAndTrackingStatus(
    input.userId,
    "inbox"
  );
  const seats = Math.max(0, MAX_OPEN_INBOX - openInbox);
  const toLand = await remainingLandBudget({
    userId: input.userId,
    runId: input.runId,
    jobsPerRun: prefs.jobsPerRun,
    hasAiKey
  });
  if (toLand === 0) {
    return { landed: 0, reason: seats === 0 ? "inbox_full" : "ok" };
  }

  const seen = await applicationRepository.listUserUrlsAndPostingIds(input.userId);
  const shelf = await jobPostingRepository.listOpenForLand({
    excludeUrls: seen.urls,
    excludePostingIds: seen.postingIds
  });

  const passed: ScoredPosting[] = [];
  for (const posting of shelf) {
    const cheap = scoreCatalogAgainstPreference(
      {
        title: posting.title,
        companyName: posting.companyName,
        location: posting.location,
        workMode: asWorkMode(posting.workMode),
        skills: posting.skills ?? [],
        salaryMin: posting.salaryMin,
        salaryCurrency: posting.salaryCurrency
      },
      prefs
    );
    if (!cheap.passed) continue;
    passed.push({ posting, score: cheap.score, reasons: cheap.reasons });
  }
  passed.sort(compareScoredPostings);

  const attempted = new Set<string>();
  let landed = 0;
  /** Listing-page hydrate is the slow hop — run a small pool, not one-by-one. */
  const LAND_CONCURRENCY = 4;

  const landUpTo = async (limit: number): Promise<void> => {
    let next = 0;
    let reserved = 0;
    const worker = async (): Promise<void> => {
      while (true) {
        if (reserved >= limit) return;
        reserved += 1;
        const index = next;
        next += 1;
        const candidate = passed[index];
        if (!candidate) {
          reserved -= 1;
          return;
        }
        if (attempted.has(candidate.posting.id)) {
          reserved -= 1;
          continue;
        }
        attempted.add(candidate.posting.id);
        try {
          const enqueued = await enqueueEvaluateIfPassed({
            userId: input.userId,
            runId: input.runId,
            candidate,
            hasAiKey,
            prefs
          });
          if (enqueued) landed += 1;
          else reserved -= 1;
        } catch {
          reserved -= 1;
        }
      }
    };
    const pool = Math.min(LAND_CONCURRENCY, Math.max(1, limit));
    await Promise.all(Array.from({ length: pool }, () => worker()));
  };

  await landUpTo(toLand);

  // In-flight evaluate is not an inbox row — subtract this call's enqueues so
  // extra pass cannot double the evaluate pool while keepers are still pending.
  const extraBudget = Math.max(
    0,
    (await remainingLandBudget({
      userId: input.userId,
      runId: input.runId,
      jobsPerRun: prefs.jobsPerRun,
      hasAiKey
    })) - landed
  );
  if (extraBudget > 0) {
    await landUpTo(extraPassCreateLimit(extraBudget));
  }

  return { landed, reason: landed === 0 ? "empty_shelf" : "ok" };
}
