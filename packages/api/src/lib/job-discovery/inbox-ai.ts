import {
  applyZeroDollarCandidate,
  buildApplicationSourceTags,
  canonicalizeJobUrl,
  decideTwoAxis,
  dailyAiAttemptCap,
  EmploymentTypeSchema,
  inferApplicationSource,
  INBOX_TTL_MS,
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

import { generateAgentTake } from "#@/lib/application/generate-agent-take";
import { loadJobPreference } from "#@/lib/application/load-job-preference";
import { scoreApplicationMatch } from "#@/lib/application/score-application-match";
import { requestJobDiscoveryLand } from "#@/lib/job-discovery/enqueue";
import { formatCatalogSalaryRange } from "#@/lib/job-discovery/hydrate";
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
  names: string[]
): Promise<{ requiredSkills: JobSkillTag[]; preferredSkills: JobSkillTag[] }> {
  const stacks = await stackRepository.findAllByUserId(userId);
  const tags = resolveJobSkillTags(
    names.map((name) => {
      return { name, band: "required" as const };
    }),
    stacks.map((stack) => {
      return { id: stack.id, name: stack.name };
    })
  );
  return {
    requiredSkills: tags.filter((tag) => tag.band === "required"),
    preferredSkills: tags.filter((tag) => tag.band === "preferred")
  };
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
  return openInbox < MAX_OPEN_INBOX && inboxThisRun < input.jobsPerRun;
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
  dismissVia?: "low_match" | "score_error";
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

  const { row, created } = await applicationRepository.createIfAbsentByUrl({
    userId: input.userId,
    companyName: input.posting.companyName,
    title: input.posting.title,
    url: input.listingUrl,
    applyUrl: input.listingUrl,
    applyMethod: "external",
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
    trackingStatus: input.trackingStatus,
    stage: "saved",
    postingId: input.posting.id,
    discoveryRunId: input.runId,
    inboxExpiresAt: new Date(Date.now() + INBOX_TTL_MS)
  });
  if (!created) return null;

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
    prefs: { workModes: prefs.workModes, locations: prefs.locations }
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
  const { requiredSkills, preferredSkills } = await resolveSkillsForUser(
    input.userId,
    leftover.skills
  );
  const employmentType = asEmploymentType(leftover.employmentType);
  const hiringRegion = persistHiringRegion(workMode, leftover.hiringRegion);

  const baseInsert = {
    userId: input.userId,
    runId: input.runId,
    posting,
    listingUrl,
    description: leftover.description ?? posting.description,
    location: leftover.location,
    workMode,
    hiringRegion,
    employmentType,
    requiredSkills,
    preferredSkills,
    cheapScore: cheap.score,
    cheapReasons: cheap.reasons
  };

  const willCallAgent = hasAiKey && Boolean(ENV_SERVER.AGENT_WORKER_URL?.trim());
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
      trackingStatus: "inbox"
    });
    return { outcome: row ? "heuristic" : "skipped" };
  }

  const reserved = await userJobAiBudgetRepository.tryIncrement(
    input.userId,
    utcDay(),
    dailyAiAttemptCap(prefs.jobsPerRun)
  );
  if (!reserved) return { outcome: "skipped" };

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
        salaryRange: formatCatalogSalaryRange(
          posting.salaryMin,
          posting.salaryMax,
          posting.salaryCurrency
        ),
        description: leftover.description ?? posting.description,
        applyMethod: "external",
        workMode
      }
    });
  } catch (error) {
    const row = await insertDiscoveryApplication({
      ...baseInsert,
      matchScore: cheap.score,
      matchReasons: [
        "score_error",
        error instanceof Error ? error.message : "scoreApplicationMatch threw"
      ],
      trackingStatus: "dismissed",
      dismissVia: "score_error"
    });
    return { outcome: row ? "dismissed" : "skipped" };
  }

  const decision = decideInboxAiKeep(match);
  if (decision === "dismissed") {
    const row = await insertDiscoveryApplication({
      ...baseInsert,
      matchScore: match.score,
      matchReasons: match.reasons,
      trackingStatus: "dismissed",
      dismissVia: "low_match"
    });
    return { outcome: row ? "dismissed" : "skipped" };
  }

  if (decision === "heuristic") {
    await userJobAiBudgetRepository.tryDecrement(input.userId, utcDay());
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
      matchScore: match.score,
      matchReasons: match.reasons,
      trackingStatus: "inbox"
    });
    return { outcome: row ? "heuristic" : "skipped" };
  }

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
    matchScore: match.score,
    matchReasons: match.reasons,
    trackingStatus: "inbox"
  });
  if (!row) return { outcome: "skipped" };

  try {
    await generateAgentTake({
      applicationId: row.id,
      userId: input.userId
    });
  } catch {
    // Soft-fail: keeper stays; Generate take remains.
  }

  return { outcome: "passed" };
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
