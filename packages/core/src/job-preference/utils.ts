import { DEFAULT_JOBS_PER_RUN, refineJobsPerRun } from "#@/job-discovery/constants";

import { DEFAULT_IMPORT_FROM_EMAIL, DEFAULT_MIN_MATCH_SCORE, WORK_MODES } from "./constants";
import {
  SeekerMatchEvidenceSchema,
  type JobPreference,
  type JobPreferenceOutput,
  type SeekerMatchEvidence,
  type UpsertJobPreferenceInput,
  type WorkMode
} from "./types";

export function defaultJobPreference(): JobPreference {
  return {
    workModes: [],
    locations: [],
    roleKeywords: [],
    excludeKeywords: [],
    salaryMin: null,
    salaryCurrency: null,
    minMatchScore: DEFAULT_MIN_MATCH_SCORE,
    titleId: null,
    customTitle: null,
    jobsPerRun: DEFAULT_JOBS_PER_RUN,
    importFromEmail: DEFAULT_IMPORT_FROM_EMAIL
  };
}

/**
 * True when the seeker has not constrained harvest (empty filters).
 * Open profiles should not lose listings solely to minMatchScore=60 defaults —
 * AI still attaches a score for ranking in New jobs.
 */
export function isOpenJobPreference(prefs: {
  workModes?: readonly string[] | null;
  locations?: readonly string[] | null;
  roleKeywords?: readonly string[] | null;
  excludeKeywords?: readonly string[] | null;
  salaryMin?: number | null;
}): boolean {
  return (
    (prefs.roleKeywords?.length ?? 0) === 0 &&
    (prefs.excludeKeywords?.length ?? 0) === 0 &&
    (prefs.workModes?.length ?? 0) === 0 &&
    (prefs.locations?.length ?? 0) === 0 &&
    (prefs.salaryMin == null || prefs.salaryMin === undefined)
  );
}

export function defaultJobPreferenceOutput(): JobPreferenceOutput {
  return {
    ...defaultJobPreference(),
    updatedAt: null
  };
}

export function isWorkMode(value: string): value is WorkMode {
  return (WORK_MODES as readonly string[]).includes(value);
}

/** Merge partial upsert onto an existing (or default) preference body. */
export function mergeJobPreference(
  current: JobPreference,
  patch: UpsertJobPreferenceInput | undefined
): JobPreference {
  if (!patch) return current;
  return {
    workModes: patch.workModes ?? current.workModes,
    locations: patch.locations ?? current.locations,
    roleKeywords: patch.roleKeywords ?? current.roleKeywords,
    excludeKeywords: patch.excludeKeywords ?? current.excludeKeywords,
    salaryMin: patch.salaryMin !== undefined ? patch.salaryMin : current.salaryMin,
    salaryCurrency:
      patch.salaryCurrency !== undefined ? patch.salaryCurrency : current.salaryCurrency,
    minMatchScore: patch.minMatchScore ?? current.minMatchScore,
    titleId: patch.titleId !== undefined ? patch.titleId : current.titleId,
    customTitle: patch.customTitle !== undefined ? patch.customTitle : current.customTitle,
    jobsPerRun:
      patch.jobsPerRun !== undefined ? refineJobsPerRun(patch.jobsPerRun) : current.jobsPerRun,
    importFromEmail: patch.importFromEmail ?? current.importFromEmail
  };
}

/** Unique work modes in product order. */
export function normalizeWorkModes(modes: WorkMode[]): WorkMode[] {
  const set = new Set(modes);
  return WORK_MODES.filter((m) => set.has(m));
}

export function emptySeekerMatchEvidence(): SeekerMatchEvidence {
  return {
    roleTitles: [],
    organizations: [],
    stackNames: [],
    featuredStackNames: [],
    projectTitles: []
  };
}

export function seekerEvidenceHasSignal(evidence: SeekerMatchEvidence | null | undefined): boolean {
  if (!evidence) return false;
  return (
    evidence.roleTitles.length > 0 ||
    evidence.stackNames.length > 0 ||
    evidence.featuredStackNames.length > 0 ||
    evidence.projectTitles.length > 0
  );
}

/**
 * True only when harvest must surface every listing: no preference filters
 * and no career-profile signal to infer fit from.
 */
export function shouldPassAllHarvestJobs(
  prefs: {
    workModes?: readonly string[] | null;
    locations?: readonly string[] | null;
    roleKeywords?: readonly string[] | null;
    excludeKeywords?: readonly string[] | null;
    salaryMin?: number | null;
  },
  evidence?: SeekerMatchEvidence | null
): boolean {
  return isOpenJobPreference(prefs) && !seekerEvidenceHasSignal(evidence);
}

function uniqueTrimmed(values: readonly string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= max) break;
  }
  return out;
}

function stackNameFromProjectStack(
  entry: { name?: string | null } | { stack?: { name?: string | null } | null } | null | undefined
): string | null {
  if (!entry) return null;
  if ("name" in entry && typeof entry.name === "string" && entry.name.trim()) {
    return entry.name.trim();
  }
  if ("stack" in entry && entry.stack && typeof entry.stack.name === "string") {
    const name = entry.stack.name.trim();
    return name.length > 0 ? name : null;
  }
  return null;
}

/** Pure builder — callers map DB rows; this package stays DB-free. */
export function buildSeekerMatchEvidence(input: {
  experiences?: ReadonlyArray<{
    title?: string | null;
    organization?: string | null;
  }>;
  stacks?: ReadonlyArray<{
    name?: string | null;
    isFeatured?: boolean | null;
  }>;
  projects?: ReadonlyArray<{
    title?: string | null;
    stacks?: ReadonlyArray<
      { name?: string | null } | { stack?: { name?: string | null } | null } | null
    > | null;
  }>;
}): SeekerMatchEvidence {
  const roleTitles = uniqueTrimmed(
    (input.experiences ?? []).map((row) => row.title ?? ""),
    24
  );
  const organizations = uniqueTrimmed(
    (input.experiences ?? []).map((row) => row.organization ?? ""),
    24
  );
  const stackNames = uniqueTrimmed(
    (input.stacks ?? []).map((row) => row.name ?? ""),
    60
  );
  const featuredStackNames = uniqueTrimmed(
    (input.stacks ?? []).filter((row) => row.isFeatured).map((row) => row.name ?? ""),
    20
  );
  const projectTitles = uniqueTrimmed(
    (input.projects ?? []).map((row) => row.title ?? ""),
    24
  );
  const projectStackNames = uniqueTrimmed(
    (input.projects ?? []).flatMap((project) =>
      (project.stacks ?? []).map((entry) => stackNameFromProjectStack(entry) ?? "")
    ),
    40
  );
  const mergedStacks = uniqueTrimmed([...stackNames, ...projectStackNames], 60);

  return SeekerMatchEvidenceSchema.parse({
    roleTitles,
    organizations,
    stackNames: mergedStacks,
    featuredStackNames,
    projectTitles
  });
}

export function formatSeekerEvidenceForPrompt(
  evidence: SeekerMatchEvidence | null | undefined
): string {
  if (!seekerEvidenceHasSignal(evidence) || !evidence) {
    return "SeekerProfileEvidence: (none — score from JobPreference only)";
  }
  return `SeekerProfileEvidence (JSON):
${JSON.stringify(
  {
    roleTitles: evidence.roleTitles,
    organizations: evidence.organizations,
    featuredStackNames: evidence.featuredStackNames,
    stackNames: evidence.stackNames.slice(0, 40),
    projectTitles: evidence.projectTitles
  },
  null,
  2
)}`;
}
