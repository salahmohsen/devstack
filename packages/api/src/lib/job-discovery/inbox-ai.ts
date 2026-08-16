import {
  applyZeroDollarCandidate,
  buildApplicationSourceTags,
  canonicalizeJobUrl,
  decideTwoAxis,
  dailyAiAttemptCap,
  EmploymentTypeSchema,
  inferApplicationSource,
  INBOX_TTL_MS,
  inboxKeeperInsertAllowed,
  isThinJobDescription,
  JOB_ADAPTER_IDS,
  JOB_ADAPTER_LABELS,
  MAX_OPEN_INBOX,
  resolveJobSkillTags,
  scoreCatalogAgainstPreference,
  WorkModeSchema,
  type ApplicationSource,
  type EmploymentType,
  type JobAdapterId,
  type JobInboxAiPayload,
  type JobSkillTag,
  type WorkMode
} from "@tsu-stack/core";
import {
  applicationActivityRepository,
  applicationRepository,
  jobPostingRepository,
  stackRepository,
  userJobAiBudgetRepository,
  type ApplicationEntity,
  type JobPostingEntity
} from "@tsu-stack/db";
import { ENV_SERVER } from "@tsu-stack/env/server/env";

import { generateAgentTake, generateAgentTakeText } from "#@/lib/application/generate-agent-take";
import { loadJobPreference } from "#@/lib/application/load-job-preference";
import { scoreApplicationMatch } from "#@/lib/application/score-application-match";
import { requestJobDiscoveryLand } from "#@/lib/job-discovery/enqueue";
import { formatCatalogSalaryRange } from "#@/lib/job-discovery/hydrate";
import {
  leftoverExtractFromListing,
  leftoverExtractIfNeeded,
  mergeLeftoverExtract
} from "#@/lib/job-discovery/leftover-extract";
import { resolveRuntimeAiCredentials } from "#@/lib/settings/resolve-runtime-ai";

export type InboxAiOutcome = "passed" | "dismissed" | "heuristic" | "skipped";

const FREEHIRE_SOURCE_LABELS: Record<string, string> = {
  greenhouse: "Greenhouse",
  ashby: "Ashby",
  lever: "Lever",
  workable: "Workable",
  smartrecruiters: "SmartRecruiters"
};

/**
 * Soft AI failure (heuristic fallback) must not auto-dismiss.
 * minMatchScore is the AI bar; cheap already passed at land.
 */
export function decideInboxAiKeep(match: {
  passed: boolean;
  source: "ai" | "heuristic";
}): "passed" | "dismissed" | "heuristic" {
  if (match.source === "heuristic") return "heuristic";
  return match.passed ? "passed" : "dismissed";
}

export type EvaluateInsertPlan =
  | { outcome: "skipped"; insert: null; backfill: true }
  | {
      outcome: "dismissed";
      insert: { trackingStatus: "dismissed"; agentTake: null };
      backfill: true;
    }
  | {
      outcome: "heuristic" | "passed";
      insert: { trackingStatus: "inbox"; agentTake: string | null };
      backfill: false;
    };

/**
 * Evaluate insert plan. score_error never creates a dismissed row.
 * Pass includes take text (or null on take-fail) before insert.
 */
export function decideEvaluateOutcome(input: {
  scoreError: boolean;
  keep: "passed" | "dismissed" | "heuristic" | null;
  takeText: string | null;
}): EvaluateInsertPlan {
  if (input.scoreError) {
    return { outcome: "skipped", insert: null, backfill: true };
  }
  if (input.keep === "dismissed") {
    return {
      outcome: "dismissed",
      insert: { trackingStatus: "dismissed", agentTake: null },
      backfill: true
    };
  }
  if (input.keep === "heuristic") {
    return {
      outcome: "heuristic",
      insert: { trackingStatus: "inbox", agentTake: null },
      backfill: false
    };
  }
  return {
    outcome: "passed",
    insert: { trackingStatus: "inbox", agentTake: input.takeText },
    backfill: false
  };
}

/** Soft score fallback must not refund 2×N after leftover extract already used the tick. */
export function shouldRefundHeuristicIncrement(leftoverExtractRan: boolean): boolean {
  return !leftoverExtractRan;
}

function utcDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function asWorkMode(value: string | null | undefined): WorkMode | null {
  const parsed = WorkModeSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function asEmploymentType(value: string | null | undefined): EmploymentType {
  const parsed = EmploymentTypeSchema.safeParse(value);
  return parsed.success ? parsed.data : "unknown";
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

function persistHiringRegion(
  workMode: WorkMode | null,
  hiringRegion: string | null
): string | null {
  if (hiringRegion?.trim()) return hiringRegion.trim();
  return workMode === "remote" ? "worldwide" : null;
}

async function resolveSkillsForUser(
  userId: string,
  required: readonly string[],
  preferred: readonly string[] = []
): Promise<{ requiredSkills: JobSkillTag[]; preferredSkills: JobSkillTag[] }> {
  const stacks = await stackRepository.findAllByUserId(userId);
  const tags = resolveJobSkillTags(
    [
      ...required.map((name) => {
        return { name, band: "required" as const };
      }),
      ...preferred.map((name) => {
        return { name, band: "preferred" as const };
      })
    ],
    stacks.map((stack) => {
      return { id: stack.id, name: stack.name };
    })
  );
  return {
    requiredSkills: tags.filter((tag) => tag.band === "required"),
    preferredSkills: tags.filter((tag) => tag.band === "preferred")
  };
}

/** Re-check immediately before inbox insert. Dismissed is never gated. */
export function shouldInsertAfterCapRecheck(input: {
  trackingStatus: "inbox" | "dismissed";
  openInbox: number;
  inboxThisRun: number;
  jobsPerRun: number;
}): boolean {
  if (input.trackingStatus !== "inbox") return true;
  return inboxKeeperInsertAllowed({
    openInbox: input.openInbox,
    inboxThisRun: input.inboxThisRun,
    jobsPerRun: input.jobsPerRun
  });
}

async function canInsertInboxKeeper(input: {
  userId: string;
  runId: string;
  jobsPerRun: number;
}): Promise<boolean> {
  const [openInbox, inboxThisRun] = await Promise.all([
    applicationRepository.countByUserIdAndTrackingStatus(input.userId, "inbox"),
    applicationRepository.countInboxThisRun(input.userId, input.runId)
  ]);
  return shouldInsertAfterCapRecheck({
    trackingStatus: "inbox",
    openInbox,
    inboxThisRun,
    jobsPerRun: input.jobsPerRun
  });
}

async function dismissExistingAndBackfill(input: {
  userId: string;
  applicationId: string;
  runId: string;
  via: "low_match" | "score_error";
  score: number | null;
  reasons: string[];
}): Promise<"dismissed" | "skipped"> {
  const dismissed = await applicationRepository.setTrackingStatus(
    input.applicationId,
    input.userId,
    "dismissed"
  );
  if (!dismissed) return "skipped";

  await applicationActivityRepository.append({
    userId: input.userId,
    applicationId: input.applicationId,
    kind: "dismissed",
    metadata: {
      via: input.via,
      runId: input.runId,
      score: input.score,
      reasons: input.reasons
    }
  });
  await requestJobDiscoveryLand({
    userId: input.userId,
    runId: input.runId,
    trigger: "backfill"
  });
  return "dismissed";
}

async function insertDiscoveryApplication(input: {
  userId: string;
  runId: string;
  posting: JobPostingEntity;
  listingUrl: string;
  description: string | null;
  location: string | null;
  workMode: WorkMode;
  hiringRegion: string | null;
  employmentType: EmploymentType;
  requiredSkills: JobSkillTag[];
  preferredSkills: JobSkillTag[];
  matchScore: number | null;
  cheapScore: number;
  cheapReasons: string[];
  matchReasons: string[];
  trackingStatus: "inbox" | "dismissed";
  jobsPerRun: number;
  dismissVia?: "low_match";
  agentTake?: string | null;
}): Promise<ApplicationEntity | null> {
  const { source, sourceLabel } = discoverySourceFields({
    listingUrl: input.listingUrl,
    adapterId: input.posting.adapterId,
    sourcePlatform: input.posting.sourcePlatform
  });
  const salaryRange = formatCatalogSalaryRange(
    input.posting.salaryMin,
    input.posting.salaryMax,
    input.posting.salaryCurrency
  );

  const insertInput = {
    userId: input.userId,
    companyName: input.posting.companyName,
    title: input.posting.title,
    url: input.listingUrl,
    applyUrl: input.listingUrl,
    applyMethod: "external" as const,
    matchScore: input.matchScore,
    source,
    sourceLabel,
    sourceTags: buildApplicationSourceTags({ channel: "discovery", platform: source }),
    location: input.location,
    workMode: input.workMode,
    hiringRegion: input.hiringRegion,
    requiredSkills: input.requiredSkills,
    preferredSkills: input.preferredSkills,
    salaryRange,
    employmentType: input.employmentType,
    description: input.description,
    agentTake: input.agentTake ?? null,
    trackingStatus: input.trackingStatus,
    stage: "saved" as const,
    postingId: input.posting.id,
    discoveryRunId: input.runId,
    inboxExpiresAt: new Date(Date.now() + INBOX_TTL_MS)
  };

  const { row, created } =
    input.trackingStatus === "inbox"
      ? await applicationRepository.createInboxIfUnderCaps({
          ...insertInput,
          discoveryRunId: input.runId,
          jobsPerRun: input.jobsPerRun,
          maxOpenInbox: MAX_OPEN_INBOX
        })
      : await applicationRepository.createIfAbsentByUrl(insertInput);
  if (!created || !row) return null;

  if (input.trackingStatus === "inbox") {
    await applicationActivityRepository.append({
      userId: input.userId,
      applicationId: row.id,
      kind: "discovered",
      metadata: {
        via: "discovery",
        runId: input.runId,
        cheapScore: input.cheapScore,
        cheapReasons: input.cheapReasons,
        matchReasons: input.matchReasons,
        adapterId: input.posting.adapterId
      }
    });
    return row;
  }

  await applicationActivityRepository.append({
    userId: input.userId,
    applicationId: row.id,
    kind: "dismissed",
    metadata: {
      via: input.dismissVia ?? "low_match",
      runId: input.runId,
      score: input.matchScore,
      reasons: input.matchReasons
    }
  });
  await requestJobDiscoveryLand({
    userId: input.userId,
    runId: input.runId,
    trigger: "backfill"
  });
  return row;
}

/** Harvest / score-error path: application already exists. */
async function runInboxAiForApplication(input: {
  userId: string;
  applicationId: string;
  runId: string;
}): Promise<{ outcome: InboxAiOutcome }> {
  const owned = await applicationRepository.findByIdForUser(input.applicationId, input.userId);
  if (!owned || owned.trackingStatus !== "inbox") {
    return { outcome: "skipped" };
  }

  const [prefs, llm, posting] = await Promise.all([
    loadJobPreference(input.userId),
    resolveRuntimeAiCredentials(input.userId, "scorer"),
    owned.postingId ? jobPostingRepository.findById(owned.postingId) : Promise.resolve(null)
  ]);

  // No key or thin JD: keep the cheap-landed stub. Do not consume daily AI budget.
  if (!llm.apiKey?.trim() || isThinJobDescription(owned.description)) {
    return { outcome: "heuristic" };
  }

  const reserved = await userJobAiBudgetRepository.tryIncrement(
    input.userId,
    utcDay(),
    dailyAiAttemptCap(prefs.jobsPerRun)
  );
  if (!reserved) {
    return { outcome: "skipped" };
  }

  let match;
  try {
    match = await scoreApplicationMatch({
      userId: input.userId,
      llm,
      job: {
        listingUrl: owned.url ?? "",
        title: owned.title,
        companyName: owned.companyName,
        location: owned.location,
        salaryRange: owned.salaryRange,
        description: owned.description,
        applyMethod: owned.applyMethod,
        workMode: asWorkMode(owned.workMode) ?? asWorkMode(posting?.workMode)
      }
    });
  } catch (error) {
    // Attempt already consumed — dismiss so this stub cannot occupy N forever.
    return {
      outcome: await dismissExistingAndBackfill({
        userId: input.userId,
        applicationId: owned.id,
        runId: input.runId,
        via: "score_error",
        score: owned.matchScore,
        reasons: [
          "score_error",
          error instanceof Error ? error.message : "scoreApplicationMatch threw"
        ]
      })
    };
  }

  const decision = decideInboxAiKeep(match);
  if (decision === "dismissed") {
    return {
      outcome: await dismissExistingAndBackfill({
        userId: input.userId,
        applicationId: owned.id,
        runId: input.runId,
        via: "low_match",
        score: match.score,
        reasons: match.reasons
      })
    };
  }

  if (decision === "heuristic") {
    // Soft AI failure did not judge the JD — do not burn the 2×N cap.
    await userJobAiBudgetRepository.tryDecrement(input.userId, utcDay());
    return { outcome: "heuristic" };
  }

  await applicationRepository.update(owned.id, input.userId, {
    matchScore: match.score
  });

  try {
    await generateAgentTake({
      applicationId: owned.id,
      userId: input.userId
    });
  } catch {
    // Soft-fail: leave agentTake null. Do not retrigger land.
  }

  return { outcome: "passed" };
}

/** Discovery evaluate-then-insert: leftover extract → score → insert inbox or dismissed. */
async function runInboxAiForPosting(input: {
  userId: string;
  postingId: string;
  runId: string;
}): Promise<{ outcome: InboxAiOutcome }> {
  const [prefs, llm, posting] = await Promise.all([
    loadJobPreference(input.userId),
    resolveRuntimeAiCredentials(input.userId, "scorer"),
    jobPostingRepository.findById(input.postingId)
  ]);
  if (!posting || posting.closedAt != null) {
    return { outcome: "skipped" };
  }

  const listingUrl = canonicalizeJobUrl(posting.listingUrl);
  if (!listingUrl) return { outcome: "skipped" };

  const existing = await applicationRepository.findByUserIdAndUrl(input.userId, listingUrl);
  if (existing) return { outcome: "skipped" };

  const leftover = applyZeroDollarCandidate({
    workMode: asWorkMode(posting.workMode),
    hiringRegion: posting.hiringRegion,
    location: posting.location,
    employmentType: posting.employmentType,
    description: posting.description,
    skills: posting.skills ?? []
  });
  const workMode = leftover.workMode;
  const twoAxis = decideTwoAxis({
    workMode,
    hiringRegion: leftover.hiringRegion,
    location: leftover.location,
    prefs: {
      workModes: prefs.workModes,
      locations: prefs.locations,
      remoteRegions: prefs.remoteRegions
    }
  });
  if (twoAxis.action === "drop" || workMode == null) {
    return { outcome: "skipped" };
  }

  const hasAiKey = Boolean(llm.apiKey?.trim());
  if (hasAiKey && isThinJobDescription(leftover.description)) {
    return { outcome: "skipped" };
  }

  const cheap = scoreCatalogAgainstPreference(
    {
      title: posting.title,
      companyName: posting.companyName,
      location: leftover.location,
      workMode,
      skills: leftover.skills,
      salaryMin: posting.salaryMin,
      salaryCurrency: posting.salaryCurrency
    },
    prefs
  );
  const hiringRegion = persistHiringRegion(workMode, leftover.hiringRegion);
  const description = leftover.description ?? posting.description;
  const salaryRange = formatCatalogSalaryRange(
    posting.salaryMin,
    posting.salaryMax,
    posting.salaryCurrency
  );

  const willCallAgent = hasAiKey && Boolean(ENV_SERVER.AGENT_WORKER_URL?.trim());
  let employmentType = asEmploymentType(leftover.employmentType);
  let requiredNames = leftover.skills;
  let preferredNames: string[] = [];
  let leftoverExtractRan = false;

  if (willCallAgent) {
    const reserved = await userJobAiBudgetRepository.tryIncrement(
      input.userId,
      utcDay(),
      dailyAiAttemptCap(prefs.jobsPerRun)
    );
    if (!reserved) return { outcome: "skipped" };

    const leftoverByo = await leftoverExtractIfNeeded({
      willCallAgent: true,
      skills: requiredNames,
      employmentType,
      extract: () =>
        leftoverExtractFromListing({
          userId: input.userId,
          llm,
          job: {
            listingUrl,
            title: posting.title,
            companyName: posting.companyName,
            location: leftover.location,
            description,
            employmentType
          }
        })
    });
    leftoverExtractRan = leftoverByo.invoked;
    if (leftoverByo.invoked) {
      const merged = mergeLeftoverExtract(
        { employmentType, required: requiredNames, preferred: preferredNames },
        leftoverByo.result
      );
      employmentType = merged.employmentType;
      requiredNames = merged.required;
      preferredNames = merged.preferred;
    }
  }

  const { requiredSkills, preferredSkills } = await resolveSkillsForUser(
    input.userId,
    requiredNames,
    preferredNames
  );

  const baseInsert = {
    userId: input.userId,
    runId: input.runId,
    posting,
    listingUrl,
    description,
    location: leftover.location,
    workMode,
    hiringRegion,
    employmentType,
    requiredSkills,
    preferredSkills,
    cheapScore: cheap.score,
    cheapReasons: cheap.reasons
  };

  if (!willCallAgent) {
    if (
      !(await canInsertInboxKeeper({
        userId: input.userId,
        runId: input.runId,
        jobsPerRun: prefs.jobsPerRun
      }))
    ) {
      return { outcome: "skipped" };
    }
    const row = await insertDiscoveryApplication({
      ...baseInsert,
      matchScore: cheap.score,
      matchReasons: cheap.reasons,
      trackingStatus: "inbox",
      jobsPerRun: prefs.jobsPerRun
    });
    return { outcome: row ? "heuristic" : "skipped" };
  }

  let match;
  try {
    match = await scoreApplicationMatch({
      userId: input.userId,
      llm,
      job: {
        listingUrl,
        title: posting.title,
        companyName: posting.companyName,
        location: leftover.location,
        salaryRange,
        description,
        applyMethod: "external",
        workMode
      }
    });
  } catch {
    const plan = decideEvaluateOutcome({ scoreError: true, keep: null, takeText: null });
    if (plan.backfill) {
      await requestJobDiscoveryLand({
        userId: input.userId,
        runId: input.runId,
        trigger: "backfill"
      });
    }
    return { outcome: plan.outcome };
  }

  const keep = decideInboxAiKeep(match);
  let takeText: string | null = null;
  if (keep === "heuristic" && shouldRefundHeuristicIncrement(leftoverExtractRan)) {
    await userJobAiBudgetRepository.tryDecrement(input.userId, utcDay());
  }
  if (keep === "passed") {
    try {
      const take = await generateAgentTakeText({
        userId: input.userId,
        llm,
        job: {
          title: posting.title,
          companyName: posting.companyName,
          location: leftover.location,
          employmentType,
          salaryRange,
          matchScore: match.score,
          description
        },
        matchReasons: match.reasons
      });
      takeText = take.ok ? take.text : null;
    } catch {
      takeText = null;
    }
  }

  const plan = decideEvaluateOutcome({ scoreError: false, keep, takeText });
  if (!plan.insert) {
    if (plan.backfill) {
      await requestJobDiscoveryLand({
        userId: input.userId,
        runId: input.runId,
        trigger: "backfill"
      });
    }
    return { outcome: plan.outcome };
  }

  if (
    plan.insert.trackingStatus === "inbox" &&
    !(await canInsertInboxKeeper({
      userId: input.userId,
      runId: input.runId,
      jobsPerRun: prefs.jobsPerRun
    }))
  ) {
    return { outcome: "skipped" };
  }

  const row = await insertDiscoveryApplication({
    ...baseInsert,
    matchScore:
      keep === "dismissed" || keep === "passed" || keep === "heuristic" ? match.score : cheap.score,
    matchReasons: match.reasons,
    trackingStatus: plan.insert.trackingStatus,
    jobsPerRun: prefs.jobsPerRun,
    dismissVia: plan.insert.trackingStatus === "dismissed" ? "low_match" : undefined,
    agentTake: plan.insert.agentTake
  });
  return { outcome: row ? plan.outcome : "skipped" };
}

export async function runInboxAi(input: JobInboxAiPayload): Promise<{ outcome: InboxAiOutcome }> {
  if (input.applicationId) {
    return runInboxAiForApplication({
      userId: input.userId,
      applicationId: input.applicationId,
      runId: input.runId
    });
  }
  if (input.postingId) {
    return runInboxAiForPosting({
      userId: input.userId,
      postingId: input.postingId,
      runId: input.runId
    });
  }
  return { outcome: "skipped" };
}
