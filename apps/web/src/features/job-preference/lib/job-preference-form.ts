import {
  DEFAULT_MIN_MATCH_SCORE,
  JobPreferenceFieldsSchema,
  WORK_MODE_LABELS,
  WORK_MODES,
  isWorkMode,
  type WorkMode
} from "@tsu-stack/core";
import { normalizeTags } from "@tsu-stack/ui/components/tags-input";

import { type JobPreferenceQueryResult } from "@/features/job-preference/api/get-job-preference.query";

export type JobPreferenceFormState = {
  workModes: WorkMode[];
  locations: string[];
  roleKeywords: string[];
  excludeKeywords: string[];
  minMatchScore: number;
};

export const JobPreferenceFormSchema = JobPreferenceFieldsSchema.pick({
  workModes: true,
  locations: true,
  roleKeywords: true,
  excludeKeywords: true,
  minMatchScore: true
});

export const JOB_PREFERENCE_WORK_MODE_OPTIONS = WORK_MODES.map((mode) => {
  return {
    value: mode,
    label: WORK_MODE_LABELS[mode]
  };
});

export const emptyJobPreferenceForm: JobPreferenceFormState = {
  workModes: [],
  locations: [],
  roleKeywords: [],
  excludeKeywords: [],
  minMatchScore: DEFAULT_MIN_MATCH_SCORE
};

export function jobPreferenceFormFromQuery(data: JobPreferenceQueryResult): JobPreferenceFormState {
  return {
    workModes: data.workModes.filter(isWorkMode),
    locations: [...data.locations],
    roleKeywords: [...data.roleKeywords],
    excludeKeywords: [...data.excludeKeywords],
    minMatchScore: data.minMatchScore
  };
}

export function jobPreferenceInputFromForm(value: JobPreferenceFormState) {
  return {
    workModes: value.workModes,
    locations: normalizeTags(value.locations, 50, 120),
    roleKeywords: normalizeTags(value.roleKeywords, 50, 120),
    excludeKeywords: normalizeTags(value.excludeKeywords, 50, 120),
    minMatchScore: value.minMatchScore
  };
}
