import {
  buildApplicationSourceTags,
  canonicalizeJobUrl,
  computeLandBudget,
  dailyAiAttemptCap,
  hasValidDiscoveryTitle,
  inferApplicationSource,
  INBOX_TTL_MS,
  JOB_ADAPTER_IDS,
  JOB_ADAPTER_LABELS,
  MAX_OPEN_INBOX,
  scoreCatalogAgainstPreference,
  WorkModeSchema,
  type ApplicationSource,
  type JobAdapterId,
  type WorkMode
} from "@tsu-stack/core";
import {
  applicationActivityRepository,
  applicationRepository,
  jobPostingRepository,
  userJobAiBudgetRepository,
  type JobPostingEntity
} from "@tsu-stack/db";

import { loadJobPreference } from "#@/lib/application/load-job-preference";
import { requestJobInboxAi } from "#@/lib/job-discovery/enqueue";
import { formatCatalogSalaryRange, hydratePostingIfNeeded } from "#@/lib/job-discovery/hydrate";
import { resolveRuntimeAiCredentials } from "#@/lib/settings/resolve-runtime-ai";

const FREEHIRE_SOURCE_LABELS: Record<string, string> = {
  greenhouse: "Greenhouse",
  ashby: "Ashby",
  lever: "Lever",
  workable: "Workable",
  smartrecruiters: "SmartRecruiters"
};

export type DiscoveryLandReason = "ok" | "title_required" | "inbox_full" | "empty_shelf";

export type DiscoveryLandResult = {
  landed: number;
  reason: DiscoveryLandReason;
};

function utcDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function asWorkMode(value: string | null): WorkMode | null {
  const parsed = WorkModeSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function isJobAdapterId(value: string): value is JobAdapterId {
  return (JOB_ADAPTER_IDS as readonly string[]).includes(value);
}

function adapterDisplayName(adapterId: string, sourcePlatform: string | null): string {
  const platform = sourcePlatform?.trim().toLowerCase() ?? "";
  if (platform && FREEHIRE_SOURCE_LABELS[platform]) return FREEHIRE_SOURCE_LABELS[platform]!;
  if (isJobAdapterId(adapterId)) return JOB_ADAPTER_LABELS[adapterId];
  if (sourcePlatform?.trim()) {
    const raw = sourcePlatform.trim();
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }
  return adapterId;
}

function discoverySourceFields(input: {
  listingUrl: string;
  adapterId: string;
  sourcePlatform: string | null;
}): { source: ApplicationSource; sourceLabel: string | null } {
  const source = inferApplicationSource(input.listingUrl);
  if (source !== "other" && source !== "company_website") {
    return { source, sourceLabel: null };
  }
  return {
    source,
    sourceLabel: adapterDisplayName(input.adapterId, input.sourcePlatform)
  };
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
  const [openInbox, inboxThisRun, remaining] = await Promise.all([
    applicationRepository.countByUserIdAndTrackingStatus(input.userId, "inbox"),
    applicationRepository.countInboxThisRun(input.userId, input.runId),
    userJobAiBudgetRepository.remainingAttempts(
      input.userId,
      utcDay(),
      dailyAiAttemptCap(prefs.jobsPerRun)
    )
  ]);

  const seats = Math.max(0, MAX_OPEN_INBOX - openInbox);
  const toLand = computeLandBudget({
    jobsPerRun: prefs.jobsPerRun,
    openInbox,
    inboxThisRun,
    remainingDailyAiAttempts: remaining,
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

  let landed = 0;
  for (const candidate of passed) {
    if (landed >= toLand) break;
    try {
      const hydrate = await hydratePostingIfNeeded(candidate.posting.id);
      const posting = await jobPostingRepository.findById(candidate.posting.id);
      if (!posting || posting.closedAt != null || hydrate.listingClosed) continue;

      const listingUrl = canonicalizeJobUrl(posting.listingUrl);
      if (!listingUrl) continue;

      const { source, sourceLabel } = discoverySourceFields({
        listingUrl,
        adapterId: posting.adapterId,
        sourcePlatform: posting.sourcePlatform
      });
      const salaryRange =
        hydrate.salaryRange ??
        formatCatalogSalaryRange(posting.salaryMin, posting.salaryMax, posting.salaryCurrency);
      const location = applicationLocation(hydrate.location, posting.location);
      const description = hydrate.description ?? posting.description;

      const { row, created } = await applicationRepository.createIfAbsentByUrl({
        userId: input.userId,
        companyName: posting.companyName,
        title: posting.title,
        url: listingUrl,
        applyUrl: listingUrl,
        applyMethod: "external",
        matchScore: candidate.score,
        source,
        sourceLabel,
        sourceTags: buildApplicationSourceTags({ channel: "discovery", platform: source }),
        location,
        salaryRange,
        description,
        trackingStatus: "inbox",
        stage: "saved",
        postingId: posting.id,
        discoveryRunId: input.runId,
        inboxExpiresAt: new Date(Date.now() + INBOX_TTL_MS)
      });
      if (!created) continue;

      const locationFix = applicationLocation(hydrate.location, row.location);
      const salaryFix = salaryRange ?? row.salaryRange;
      if (locationFix !== row.location || salaryFix !== row.salaryRange) {
        await applicationRepository.update(row.id, input.userId, {
          location: locationFix,
          salaryRange: salaryFix
        });
      }

      await applicationActivityRepository.append({
        userId: input.userId,
        applicationId: row.id,
        kind: "discovered",
        metadata: {
          via: "discovery",
          runId: input.runId,
          cheapScore: candidate.score,
          cheapReasons: candidate.reasons,
          matchReasons: candidate.reasons,
          adapterId: posting.adapterId
        }
      });

      if (hasAiKey) {
        await requestJobInboxAi({
          userId: input.userId,
          applicationId: row.id,
          runId: input.runId
        });
      }

      landed += 1;
    } catch {
      continue;
    }
  }

  return { landed, reason: landed === 0 ? "empty_shelf" : "ok" };
}
