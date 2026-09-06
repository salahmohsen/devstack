import {
  applyZeroDollarCandidate,
  computeLandBudget,
  dailyAiAttemptCap,
  decideTwoAxis,
  DISCOVERY_FETCH_POOL_SIZE,
  hasValidRoleQuery,
  isThinJobDescription,
  MAX_OPEN_INBOX,
  scoreCatalogAgainstPreference,
  WorkModeSchema,
  type TwoAxisPrefs,
  type WorkMode
} from "@tsu-stack/core";
import {
  applicationRepository,
  userJobAiBudgetRepository,
  userJobRepository,
  type UserJobEntity
} from "@tsu-stack/db";

import { loadJobPreferenceOutput } from "#@/lib/application/load-job-preference";
import { requestJobInboxAi } from "#@/lib/job-discovery/enqueue";
import { utcDay } from "#@/lib/job-discovery/enrollment";
import { fetchUserJobs } from "#@/lib/job-discovery/fetch";
import { resolveRuntimeAiCredentials } from "#@/lib/settings/resolve-runtime-ai";

export type DiscoveryLandReason =
  | "ok"
  | "title_required"
  | "fetch_failed"
  | "inbox_full"
  | "empty_shelf";

export type DiscoveryLandResult = {
  landed: number;
  reason: DiscoveryLandReason;
};

function asWorkMode(value: string | null | undefined): WorkMode | null {
  const parsed = WorkModeSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function trimmedOrNull(value: string | null | undefined): string | null {
  const text = value?.trim();
  return text != null && text.length > 0 ? text : null;
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

type ScoredUserJob = {
  job: UserJobEntity;
  score: number;
  reasons: string[];
};

function compareScoredUserJobs(a: ScoredUserJob, b: ScoredUserJob): number {
  if (b.score !== a.score) return b.score - a.score;
  const aPosted = a.job.postedAt?.getTime() ?? 0;
  const bPosted = b.job.postedAt?.getTime() ?? 0;
  return bPosted - aPosted;
}

async function remainingLandBudget(input: {
  userId: string;
  runId: string;
  poolSize: number;
  dailyBoardScoreCap: number;
  hasAiKey: boolean;
}): Promise<number> {
  const [openInbox, inboxThisRun, remaining] = await Promise.all([
    applicationRepository.countByUserIdAndTrackingStatus(input.userId, "inbox"),
    applicationRepository.countInboxThisRun(input.userId, input.runId),
    userJobAiBudgetRepository.remainingAttempts(
      input.userId,
      utcDay(),
      dailyAiAttemptCap(input.dailyBoardScoreCap)
    )
  ]);
  return computeLandBudget({
    poolSize: input.poolSize,
    openInbox,
    inboxThisRun,
    remainingDailyAiAttempts: remaining,
    hasAiKey: input.hasAiKey
  });
}

/** $0 two-axis pass enqueues evaluate on the user_job snapshot — no hydrate hop. */
async function enqueueEvaluateIfPassed(input: {
  userId: string;
  runId: string;
  candidate: ScoredUserJob;
  hasAiKey: boolean;
  prefs: TwoAxisPrefs;
}): Promise<boolean> {
  const job = input.candidate.job;
  // With a BYO key, N is AI-passed keepers. Do not spend an evaluate on a thin JD.
  if (input.hasAiKey && isThinJobDescription(job.description)) return false;

  const gate = decideLandCandidate({
    workMode: asWorkMode(job.workMode),
    hiringRegion: null,
    location: trimmedOrNull(job.location),
    description: job.description,
    prefs: input.prefs
  });
  if (!gate.created) return false;

  return requestJobInboxAi({
    userId: input.userId,
    runId: input.runId,
    jobId: job.id
  });
}

export async function runDiscoveryLand(input: {
  userId: string;
  runId: string;
}): Promise<DiscoveryLandResult> {
  const [prefs, llm] = await Promise.all([
    loadJobPreferenceOutput(input.userId),
    resolveRuntimeAiCredentials(input.userId, "scorer")
  ]);

  if (!hasValidRoleQuery({ roleKeywords: prefs.roleKeywords, categories: prefs.categories })) {
    return { landed: 0, reason: "title_required" };
  }

  // Fetch first: the run's shelf is this user's own freehire results.
  const fetched = await fetchUserJobs({ userId: input.userId, preference: prefs });
  if (!fetched.ok) {
    return { landed: 0, reason: "fetch_failed" };
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
    poolSize: DISCOVERY_FETCH_POOL_SIZE,
    dailyBoardScoreCap: prefs.dailyBoardScoreCap,
    hasAiKey
  });
  if (toLand === 0) {
    return { landed: 0, reason: seats === 0 ? "inbox_full" : "ok" };
  }

  const seen = await applicationRepository.listUserSeenRefs(input.userId);
  const shelf = await userJobRepository.listUnlanded({
    userId: input.userId,
    excludeUrls: seen.urls,
    excludeJobIds: seen.jobIds,
    limit: DISCOVERY_FETCH_POOL_SIZE,
    queryHash: fetched.hash
  });

  const passed: ScoredUserJob[] = [];
  for (const job of shelf) {
    const cheap = scoreCatalogAgainstPreference(
      {
        title: job.title,
        companyName: job.companyName,
        location: trimmedOrNull(job.location),
        workMode: asWorkMode(job.workMode),
        skills: job.skills ?? [],
        salaryMin: job.salaryMin,
        salaryCurrency: job.salaryCurrency
      },
      prefs
    );
    if (!cheap.passed) continue;
    passed.push({ job, score: cheap.score, reasons: cheap.reasons });
  }
  passed.sort(compareScoredUserJobs);

  const twoAxisPrefs: TwoAxisPrefs = {
    workModes: prefs.workModes,
    locations: prefs.cities ?? [],
    remoteRegions: prefs.regions ?? []
  };

  const attempted = new Set<string>();
  let landed = 0;
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
        if (attempted.has(candidate.job.id)) {
          reserved -= 1;
          continue;
        }
        attempted.add(candidate.job.id);
        try {
          const enqueued = await enqueueEvaluateIfPassed({
            userId: input.userId,
            runId: input.runId,
            candidate,
            hasAiKey,
            prefs: twoAxisPrefs
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
      poolSize: DISCOVERY_FETCH_POOL_SIZE,
      dailyBoardScoreCap: prefs.dailyBoardScoreCap,
      hasAiKey
    })) - landed
  );
  if (extraBudget > 0) {
    await landUpTo(extraPassCreateLimit(extraBudget));
  }

  return { landed, reason: landed === 0 ? "empty_shelf" : "ok" };
}
