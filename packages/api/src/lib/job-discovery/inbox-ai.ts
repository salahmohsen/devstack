import {
  applyYearsCap,
  applyZeroDollarCandidate,
  buildApplicationSourceTags,
  canonicalizeJobUrl,
  classifyJobSkills,
  decideStructuredJobPlace,
  dailyAiAttemptCap,
  DISCOVERY_FETCH_POOL_SIZE,
  DISCOVERY_AI_FALLBACK_NOTE,
  DISCOVERY_NO_AI_NOTE,
  EmploymentTypeSchema,
  inferApplicationSource,
  INBOX_TTL_MS,
  inboxKeeperInsertAllowed,
  isThinJobDescription,
  MAX_OPEN_INBOX,
  mergeExperienceYears,
  resolveFreehireSkillTags,
  scoreCatalogAgainstPreference,
  WorkModeSchema,
  type ApplicationSource,
  type EmploymentType,
  type JobInboxAiPayload,
  type JobSkillTag,
  type WorkMode
} from "@tsu-stack/core";
import {
  applicationActivityRepository,
  jobDiscoveryRunRepository,
  applicationRepository,
  experienceRepository,
  stackRepository,
  userJobAiBudgetRepository,
  userJobRepository,
  type ApplicationEntity,
  type UserJobEntity
} from "@tsu-stack/db";
import { ENV_SERVER } from "@tsu-stack/env/server/env";
import { createLogger } from "@tsu-stack/logger/server";

import { generateAgentTake, generateAgentTakeText } from "#@/lib/application/generate-agent-take";
import { loadJobPreferenceOutput } from "#@/lib/application/load-job-preference";
import { scoreApplicationMatch } from "#@/lib/application/score-application-match";
import { requestJobDiscoveryLand } from "#@/lib/job-discovery/enqueue";
import { utcDay } from "#@/lib/job-discovery/enrollment";
import { resolveRuntimeAiCredentials } from "#@/lib/settings/resolve-runtime-ai";

export type InboxAiOutcome = "passed" | "dismissed" | "heuristic" | "skipped" | "failed";

async function displayScoreForUser(input: {
  userId: string;
  aiScore: number;
  listingMinYears: number | null | undefined;
}): Promise<{
  landScore: number;
  displayScore: number;
  capped: boolean;
  seekerYears: number | null;
}> {
  const rows = await experienceRepository.findAllByUserId(input.userId);
  const seekerYears = mergeExperienceYears(rows);
  const cap = applyYearsCap({
    aiScore: input.aiScore,
    listingMinYears: input.listingMinYears,
    seekerYears
  });
  return { ...cap, seekerYears };
}

const FREEHIRE_SOURCE_LABELS: Record<string, string> = {
  greenhouse: "Greenhouse",
  ashby: "Ashby",
  lever: "Lever",
  workable: "Workable",
  smartrecruiters: "SmartRecruiters"
};

/** Freehire-stated snapshot pay as a lander string, e.g. `$120k–$150k USD`. */
function formatSnapshotSalaryRange(
  salaryMin: number | null,
  salaryMax: number | null,
  salaryCurrency: string | null,
  salaryPeriod?: string | null
): string | null {
  if (salaryMin == null && salaryMax == null) return null;
  const fmt = (n: number) => (n % 1000 === 0 && Math.abs(n) >= 1000 ? `${n / 1000}k` : `${n}`);
  const range =
    salaryMin != null && salaryMax != null
      ? `${fmt(salaryMin)}–${fmt(salaryMax)}`
      : fmt(salaryMin ?? salaryMax!);
  const currency = salaryCurrency?.trim();
  return `${range}${currency ? ` ${currency}` : ""}${salaryPeriod ? `/${salaryPeriod}` : " (period not stated)"}`;
}

/**
 * Soft AI failure (heuristic fallback) must not treat minMatchScore as a cheap
 * gate. Real rules misses (exclude, level, title-keyword, open-prefs evidence)
 * still dismiss so a parse fallback cannot park junk in New jobs.
 */
export function decideInboxAiKeep(match: {
  passed: boolean;
  source: "ai" | "heuristic";
  rulesFailed?: boolean;
}): "passed" | "dismissed" | "heuristic" {
  if (match.source === "heuristic") {
    return match.rulesFailed ? "dismissed" : "heuristic";
  }
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
      insert: { trackingStatus: "inbox", agentTake: input.takeText },
      backfill: false
    };
  }
  return {
    outcome: "passed",
    insert: { trackingStatus: "inbox", agentTake: input.takeText },
    backfill: false
  };
}

/** One take attempt for an inbox keeper. Failure does not block land. */
async function takeOnceForKeeper(
  input: Parameters<typeof generateAgentTakeText>[0]
): Promise<string | null> {
  try {
    const take = await generateAgentTakeText(input);
    return take.ok ? take.text : null;
  } catch {
    return null;
  }
}

function asWorkMode(value: string | null | undefined): WorkMode | null {
  const parsed = WorkModeSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function asEmploymentType(value: string | null | undefined): EmploymentType {
  const parsed = EmploymentTypeSchema.safeParse(value);
  return parsed.success ? parsed.data : "unknown";
}

function trimmedOrNull(value: string | null | undefined): string | null {
  const text = value?.trim();
  return text != null && text.length > 0 ? text : null;
}

function sourceDisplayName(sourcePlatform: string | null): string {
  const platform = sourcePlatform?.trim().toLowerCase() ?? "";
  if (platform && FREEHIRE_SOURCE_LABELS[platform]) return FREEHIRE_SOURCE_LABELS[platform]!;
  if (sourcePlatform?.trim()) {
    const raw = sourcePlatform.trim();
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }
  return "Freehire";
}

function discoverySourceFields(input: { listingUrl: string; sourcePlatform: string | null }): {
  source: ApplicationSource;
  sourceLabel: string | null;
} {
  const source = inferApplicationSource(input.listingUrl);
  if (source !== "other" && source !== "company_website") {
    return { source, sourceLabel: null };
  }
  return { source, sourceLabel: sourceDisplayName(input.sourcePlatform) };
}

function persistHiringRegion(
  workMode: WorkMode | null,
  hiringRegion: string | null
): string | null {
  if (hiringRegion?.trim()) return hiringRegion.trim();
  return workMode === "remote" ? "worldwide" : null;
}

/**
 * Freehire skill slugs → persisted tags + domain chips.
 * Freehire `skills` are the single source of truth on the board path —
 * structured, free, already fetched. Tech slugs become skill tags (known
 * slugs canonicalize onto the allowlist, unknown survive humanized with
 * `stackId: null`); topic slugs (`fintech`, `event-driven-architecture`)
 * become domain chips and never reach Have/Missing or matching. The AI
 * skill-link stays reserved for surfaces without structured skills:
 * mail harvest, manual create, refresh-from-URL.
 */
async function resolveFreehireSkillsForUser(
  userId: string,
  slugs: readonly string[]
): Promise<{
  requiredSkills: JobSkillTag[];
  domains: string[];
  held: { id: string; name: string; aliases: string[] }[];
}> {
  const stacks = await stackRepository.findAllByUserId(userId);
  const held = stacks.map((stack) => {
    return { id: stack.id, name: stack.name, aliases: stack.aliases ?? [] };
  });
  const resolved = resolveFreehireSkillTags(slugs, held);
  return {
    requiredSkills: resolved.requiredSkills,
    domains: resolved.domains,
    held
  };
}

/** Re-check immediately before inbox insert. Dismissed is never gated. */
export function shouldInsertAfterCapRecheck(input: {
  trackingStatus: "inbox" | "dismissed";
  openInbox: number;
  inboxThisRun: number;
  poolSize: number;
}): boolean {
  if (input.trackingStatus !== "inbox") return true;
  return inboxKeeperInsertAllowed({
    openInbox: input.openInbox,
    inboxThisRun: input.inboxThisRun,
    poolSize: input.poolSize
  });
}

async function canInsertInboxKeeper(input: {
  userId: string;
  runId: string;
  poolSize: number;
}): Promise<boolean> {
  const [openInbox, inboxThisRun] = await Promise.all([
    applicationRepository.countByUserIdAndTrackingStatus(input.userId, "inbox"),
    applicationRepository.countInboxThisRun(input.userId, input.runId)
  ]);
  return shouldInsertAfterCapRecheck({
    trackingStatus: "inbox",
    openInbox,
    inboxThisRun,
    poolSize: input.poolSize
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
  job: UserJobEntity;
  listingUrl: string;
  description: string | null;
  location: string | null;
  workMode: WorkMode;
  hiringRegion: string | null;
  employmentType: EmploymentType;
  requiredSkills: JobSkillTag[];
  preferredSkills: JobSkillTag[];
  domains: string[];
  matchScore: number | null;
  cheapScore: number;
  cheapReasons: string[];
  matchReasons: string[];
  trackingStatus: "inbox" | "dismissed";
  poolSize: number;
  dismissVia?: "low_match";
  agentTake?: string | null;
}): Promise<ApplicationEntity | null> {
  const { source, sourceLabel } = discoverySourceFields({
    listingUrl: input.listingUrl,
    sourcePlatform: input.job.source
  });
  const salaryRange = formatSnapshotSalaryRange(
    input.job.salaryMin,
    input.job.salaryMax,
    input.job.salaryCurrency,
    input.job.salaryPeriod
  );

  const insertInput = {
    userId: input.userId,
    companyName: input.job.companyName,
    title: input.job.title,
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
    domains: input.domains ?? [],
    salaryRange,
    employmentType: input.employmentType,
    description: input.description,
    agentTake: input.agentTake ?? null,
    experienceYearsMin: input.job.experienceYearsMin ?? null,
    companyLogoUrl: input.job.companyLogoUrl ?? null,
    trackingStatus: input.trackingStatus,
    stage: "saved" as const,
    jobId: input.job.id,
    discoveryRunId: input.runId,
    inboxExpiresAt: new Date(Date.now() + INBOX_TTL_MS)
  };

  const { row, created } =
    input.trackingStatus === "inbox"
      ? await applicationRepository.createInboxIfUnderCaps({
          ...insertInput,
          discoveryRunId: input.runId,
          poolSize: input.poolSize,
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
        source: input.job.source
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
  const found = await applicationRepository.findByIdForUser(input.applicationId, input.userId);
  if (!found || found.trackingStatus !== "inbox") {
    return { outcome: "skipped" };
  }
  const owned = found;

  const [prefs, llm, job] = await Promise.all([
    loadJobPreferenceOutput(input.userId),
    resolveRuntimeAiCredentials(input.userId, "scorer"),
    owned.jobId ? userJobRepository.findById(owned.jobId) : Promise.resolve(null)
  ]);

  // No key: keep the cheap-landed stub. Still-thin JD: no score budget, no take.
  if (!llm.apiKey?.trim() || isThinJobDescription(owned.description)) {
    return { outcome: "heuristic" };
  }

  const reserved = await userJobAiBudgetRepository.tryIncrement(
    input.userId,
    utcDay(),
    dailyAiAttemptCap(prefs.dailyBoardScoreCap)
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
        workMode: asWorkMode(owned.workMode) ?? asWorkMode(job?.workMode)
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
    // Soft AI failure did not judge the JD — do not burn the daily score cap.
    await userJobAiBudgetRepository.tryDecrement(input.userId, utcDay());
  }

  const cap = await displayScoreForUser({
    userId: input.userId,
    aiScore: match.score,
    listingMinYears: owned.experienceYearsMin ?? job?.experienceYearsMin
  });
  await applicationRepository.update(owned.id, input.userId, {
    matchScore: cap.displayScore,
    experienceYearsMin: owned.experienceYearsMin ?? job?.experienceYearsMin ?? null,
    companyLogoUrl: owned.companyLogoUrl ?? job?.companyLogoUrl ?? null
  });

  try {
    await generateAgentTake({
      applicationId: owned.id,
      userId: input.userId
    });
  } catch {
    // One try. Land/keep the row even if take is empty.
  }

  return { outcome: decision === "heuristic" ? "heuristic" : "passed" };
}

export async function recordDiscoveryScoringWarning(
  userId: string,
  runId: string,
  warning: string
) {
  try {
    await jobDiscoveryRunRepository.addWarning(userId, runId, warning);
  } catch (error) {
    const log = createLogger({ operation: "api__discovery_scoring_warning" });
    log.error(error instanceof Error ? error : new Error(String(error)), { userId, runId });
    log.emit({ _forceKeep: true });
  }
}

/** Discovery evaluate-then-insert: score the user_job snapshot → insert inbox or dismissed. */
async function runInboxAiForJob(input: {
  userId: string;
  jobId: string;
  runId: string;
}): Promise<{ outcome: InboxAiOutcome }> {
  const trackedRun = await jobDiscoveryRunRepository.find(input.userId, input.runId);
  if (trackedRun?.stage === "failed" || trackedRun?.stage === "completed") {
    return { outcome: "skipped" };
  }
  const [prefs, llm, job] = await Promise.all([
    loadJobPreferenceOutput(input.userId),
    resolveRuntimeAiCredentials(input.userId, "scorer"),
    userJobRepository.findById(input.jobId)
  ]);
  if (!job || job.userId !== input.userId) {
    return { outcome: "skipped" };
  }

  const listingUrl = canonicalizeJobUrl(job.listingUrl);
  if (!listingUrl) return { outcome: "skipped" };

  const existing = await applicationRepository.findByUserIdAndUrl(input.userId, listingUrl);
  if (existing) return { outcome: "skipped" };

  const sourceWorkMode = asWorkMode(job.workMode);
  const leftover = applyZeroDollarCandidate({
    workMode: sourceWorkMode,
    hiringRegion:
      sourceWorkMode === "remote"
        ? job.regions?.join(", ") || job.countries?.join(", ") || null
        : null,
    location: trimmedOrNull(job.location),
    employmentType: job.employmentType,
    description: job.description,
    skills: job.skills ?? []
  });
  const workMode = leftover.workMode;
  const twoAxis = decideStructuredJobPlace({
    regions: job.regions,
    countries: job.countries,
    cities: job.cities,
    preferredCountries: prefs.countries ?? [],
    workMode,
    hiringRegion: leftover.hiringRegion,
    location: leftover.location,
    prefs: {
      workModes: prefs.workModes,
      locations: prefs.cities ?? [],
      remoteRegions: prefs.regions ?? []
    }
  });
  if (twoAxis.action === "drop" || workMode == null) {
    return { outcome: "skipped" };
  }

  const hasAiKey = Boolean(llm.apiKey?.trim());
  if (hasAiKey && isThinJobDescription(job.description)) {
    return { outcome: "skipped" };
  }

  const cheap = scoreCatalogAgainstPreference(
    {
      title: job.title,
      companyName: job.companyName,
      location: trimmedOrNull(job.location),
      workMode,
      skills: job.skills ?? [],
      salaryMin: job.salaryMin,
      salaryCurrency: job.salaryCurrency,
      salaryPeriod: job.salaryPeriod as "month" | "year" | "day" | "hour" | null,
      category: job.category
    },
    prefs
  );
  const hiringRegion = persistHiringRegion(
    workMode,
    job.regions?.join(", ") || leftover.hiringRegion
  );
  const description = job.description;
  const salaryRange = formatSnapshotSalaryRange(
    job.salaryMin,
    job.salaryMax,
    job.salaryCurrency,
    job.salaryPeriod
  );

  const willCallAgent = hasAiKey && Boolean(ENV_SERVER.AGENT_WORKER_URL?.trim());
  const employmentType = asEmploymentType(leftover.employmentType);

  const { requiredSkills, held, domains } = await resolveFreehireSkillsForUser(
    input.userId,
    leftover.skills
  );
  const classified = classifyJobSkills({
    jobSkills: requiredSkills.map((skill) => skill.name),
    held
  });
  const skillsMatch = {
    have: classified.have,
    close: classified.close,
    missing: classified.missing,
    percent: classified.percent
  };

  const baseInsert = {
    userId: input.userId,
    runId: input.runId,
    job,
    listingUrl,
    description,
    location: trimmedOrNull(job.location),
    workMode,
    hiringRegion,
    employmentType,
    requiredSkills,
    preferredSkills: [],
    domains,
    cheapScore: cheap.score,
    cheapReasons: cheap.reasons
  };

  if (!willCallAgent) {
    if (
      !(await canInsertInboxKeeper({
        userId: input.userId,
        runId: input.runId,
        poolSize: DISCOVERY_FETCH_POOL_SIZE
      }))
    ) {
      return { outcome: "skipped" };
    }
    const row = await insertDiscoveryApplication({
      ...baseInsert,
      matchScore: cheap.score,
      matchReasons: cheap.reasons,
      trackingStatus: "inbox",
      poolSize: DISCOVERY_FETCH_POOL_SIZE
    });
    if (row) {
      await recordDiscoveryScoringWarning(
        input.userId,
        input.runId,
        hasAiKey ? DISCOVERY_AI_FALLBACK_NOTE : DISCOVERY_NO_AI_NOTE
      );
    }
    return { outcome: row ? "heuristic" : "skipped" };
  }

  const reserved = await userJobAiBudgetRepository.tryIncrement(
    input.userId,
    utcDay(),
    dailyAiAttemptCap(prefs.dailyBoardScoreCap)
  );
  if (!reserved) return { outcome: "skipped" };

  let match;
  try {
    match = await scoreApplicationMatch({
      userId: input.userId,
      llm,
      job: {
        listingUrl,
        title: job.title,
        companyName: job.companyName,
        location: trimmedOrNull(job.location),
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
    return { outcome: "failed" };
  }

  const keep = decideInboxAiKeep(match);
  const cap = await displayScoreForUser({
    userId: input.userId,
    aiScore: match.score,
    listingMinYears: job.experienceYearsMin
  });
  let takeText: string | null = null;
  if (keep === "heuristic") {
    await userJobAiBudgetRepository.tryDecrement(input.userId, utcDay());
  }
  if (keep === "passed" || keep === "heuristic") {
    takeText = await takeOnceForKeeper({
      userId: input.userId,
      llm,
      job: {
        title: job.title,
        companyName: job.companyName,
        location: trimmedOrNull(job.location),
        employmentType,
        salaryRange,
        matchScore: cap.displayScore,
        description,
        experienceYearsMin: job.experienceYearsMin,
        seekerYears: cap.seekerYears,
        yearsCapped: cap.capped,
        skillsMatch
      },
      matchReasons: match.reasons
    });
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
      poolSize: DISCOVERY_FETCH_POOL_SIZE
    }))
  ) {
    return { outcome: "skipped" };
  }

  const row = await insertDiscoveryApplication({
    ...baseInsert,
    matchScore: cap.displayScore,
    matchReasons: match.reasons,
    trackingStatus: plan.insert.trackingStatus,
    poolSize: DISCOVERY_FETCH_POOL_SIZE,
    dismissVia: plan.insert.trackingStatus === "dismissed" ? "low_match" : undefined,
    agentTake: plan.insert.agentTake
  });
  if (row && keep === "heuristic") {
    await recordDiscoveryScoringWarning(input.userId, input.runId, DISCOVERY_AI_FALLBACK_NOTE);
  }
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
  if (input.jobId) {
    return runInboxAiForJob({
      userId: input.userId,
      jobId: input.jobId,
      runId: input.runId
    });
  }
  return { outcome: "skipped" };
}
