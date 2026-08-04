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
