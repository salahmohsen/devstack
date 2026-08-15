import { z } from "zod";

import {
  DEFAULT_IMPORT_FROM_EMAIL,
  DEFAULT_JOBS_PER_RUN,
  DEFAULT_MIN_MATCH_SCORE,
  JobPreferenceFieldsSchema,
  JobTitleIdSchema,
  WORK_MODE_LABELS,
  WORK_MODES,
  isWorkMode,
  refineCustomDiscoveryTitle,
  titlePackOptions,
  type JobTitleId,
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
  titleId: JobTitleId | "";
  customTitle: string;
  jobsPerRun: number;
  importFromEmail: boolean;
};

export const JobPreferenceFormSchema = JobPreferenceFieldsSchema.pick({
  workModes: true,
  locations: true,
  roleKeywords: true,
  excludeKeywords: true,
  minMatchScore: true,
  jobsPerRun: true,
  importFromEmail: true
})
  .extend({
    titleId: JobTitleIdSchema.or(z.literal("")),
    customTitle: z.string().trim().max(120)
  })
  .superRefine(refineCustomDiscoveryTitle);

export const JOB_PREFERENCE_WORK_MODE_OPTIONS = WORK_MODES.map((mode) => {
  return {
    value: mode,
    label: WORK_MODE_LABELS[mode]
  };
});

export const JOB_TITLE_PACK_OPTIONS = titlePackOptions();

export const emptyJobPreferenceForm: JobPreferenceFormState = {
  workModes: [],
  locations: [],
  roleKeywords: [],
  excludeKeywords: [],
  minMatchScore: DEFAULT_MIN_MATCH_SCORE,
  titleId: "",
  customTitle: "",
  jobsPerRun: DEFAULT_JOBS_PER_RUN,
  importFromEmail: DEFAULT_IMPORT_FROM_EMAIL
};

export function jobPreferenceFormFromQuery(data: JobPreferenceQueryResult): JobPreferenceFormState {
  return {
    workModes: data.workModes.filter(isWorkMode),
    locations: [...data.locations],
    roleKeywords: [...data.roleKeywords],
    excludeKeywords: [...data.excludeKeywords],
    minMatchScore: data.minMatchScore,
    titleId: data.titleId ?? "",
    customTitle: data.customTitle ?? "",
    jobsPerRun: data.jobsPerRun,
    importFromEmail: data.importFromEmail
  };
}

export function jobPreferenceInputFromForm(value: JobPreferenceFormState) {
  const titleId = value.titleId === "" ? null : value.titleId;
  const customTitle = value.customTitle.trim();
  return {
    workModes: value.workModes,
    locations: normalizeTags(value.locations, 50, 120),
    roleKeywords: normalizeTags(value.roleKeywords, 50, 120),
    excludeKeywords: normalizeTags(value.excludeKeywords, 50, 120),
    minMatchScore: value.minMatchScore,
    titleId,
    customTitle: titleId === "custom" && customTitle.length > 0 ? customTitle : null,
    jobsPerRun: value.jobsPerRun,
    importFromEmail: value.importFromEmail
  };
}
