import { DEFAULT_MIN_MATCH_SCORE, WORK_MODES } from "./constants";
import {
  type JobPreference,
  type JobPreferenceOutput,
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
    minMatchScore: DEFAULT_MIN_MATCH_SCORE
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
    workModes: [],
    locations: [],
    roleKeywords: [],
    excludeKeywords: [],
    salaryMin: null,
    salaryCurrency: null,
    minMatchScore: DEFAULT_MIN_MATCH_SCORE,
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
    minMatchScore: patch.minMatchScore ?? current.minMatchScore
  };
}

/** Unique work modes in product order. */
export function normalizeWorkModes(modes: WorkMode[]): WorkMode[] {
  const set = new Set(modes);
  return WORK_MODES.filter((m) => set.has(m));
}
