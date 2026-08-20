import { z } from "zod";

import {
  DEFAULT_DAILY_BOARD_SCORE_CAP,
  DEFAULT_IMPORT_FROM_EMAIL,
  DEFAULT_JOBS_PER_RUN,
  DEFAULT_MIN_MATCH_SCORE,
  JobPreferenceFieldsSchema,
  JobTitleIdSchema,
  LEVEL_FLOOR_LABELS,
  LEVEL_FLOORS,
  LevelFloorSchema,
  WORK_MODE_LABELS,
  WORK_MODES,
  isOpenJobPreference,
  isWorkMode,
  normalizeHiringRegion,
  refineCustomDiscoveryTitle,
  titlePackOptions,
  type JobTitleId,
  type LevelFloor,
  type UpsertJobPreferenceInput,
  type WorkMode
} from "@tsu-stack/core";
import { normalizeTags } from "@tsu-stack/ui/components/tags-input";

import { type JobPreferenceQueryResult } from "@/features/job-preference/api/get-job-preference.query";

/** Postgres `integer` ceiling so the mapper cannot emit a value the column rejects. */
const MAX_MONTHLY_SALARY = 2_147_483_647;

export function parseOptionalMonthlyAmount(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return null;
  const amount = Number(trimmed);
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > MAX_MONTHLY_SALARY) return null;
  return amount;
}

export type JobPreferenceFormState = {
  workModes: WorkMode[];
  locations: string[];
  remoteRegions: string[];
  roleKeywords: string[];
  excludeKeywords: string[];
  salaryMin: string;
  salaryCurrency: string;
  levelFloor: LevelFloor | "";
  minMatchScore: number;
  titleId: JobTitleId | "";
  customTitle: string;
  jobsPerRun: number;
  dailyBoardScoreCap: number;
  importFromEmail: boolean;
};

export const JobPreferenceFormSchema = JobPreferenceFieldsSchema.pick({
  workModes: true,
  locations: true,
  remoteRegions: true,
  roleKeywords: true,
  excludeKeywords: true,
  minMatchScore: true,
  jobsPerRun: true,
  dailyBoardScoreCap: true,
  importFromEmail: true
})
  .extend({
    titleId: JobTitleIdSchema.or(z.literal("")),
    customTitle: z.string().trim().max(120),
    levelFloor: LevelFloorSchema.or(z.literal("")),
    salaryMin: z
      .string()
      .trim()
      .max(10)
      .refine(
        (value) => value === "" || parseOptionalMonthlyAmount(value) != null,
        "Enter a whole monthly amount or leave empty"
      ),
    salaryCurrency: z.string().trim().max(8)
  })
  .superRefine(refineCustomDiscoveryTitle)
  .superRefine((value, ctx) => {
    if (parseOptionalMonthlyAmount(value.salaryMin) == null) return;
    if (value.salaryCurrency.trim() !== "") return;
    ctx.addIssue({
      code: "custom",
      path: ["salaryCurrency"],
      message: "Select a currency for the monthly floor"
    });
  });

export const JOB_PREFERENCE_WORK_MODE_OPTIONS = WORK_MODES.map((mode) => {
  return {
    value: mode,
    label: WORK_MODE_LABELS[mode]
  };
});

export const JOB_TITLE_PACK_OPTIONS = titlePackOptions();

export const JOB_PREFERENCE_LEVEL_FLOOR_OPTIONS = LEVEL_FLOORS.map((level) => {
  return {
    value: level,
    label: LEVEL_FLOOR_LABELS[level]
  };
});

const COMMON_SALARY_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "EGP",
  "SAR",
  "AED",
  "KWD",
  "QAR",
  "BHD",
  "CAD",
  "AUD",
  "CHF",
  "JPY",
  "INR"
] as const;

export const JOB_PREFERENCE_SALARY_CURRENCY_OPTIONS = COMMON_SALARY_CURRENCIES.map((code) => {
  return {
    value: code,
    label: code
  };
});

export const emptyJobPreferenceForm: JobPreferenceFormState = {
  workModes: [],
  locations: [],
  remoteRegions: [],
  roleKeywords: [],
  excludeKeywords: [],
  salaryMin: "",
  salaryCurrency: "",
  levelFloor: "",
  minMatchScore: DEFAULT_MIN_MATCH_SCORE,
  titleId: "",
  customTitle: "",
  jobsPerRun: DEFAULT_JOBS_PER_RUN,
  dailyBoardScoreCap: DEFAULT_DAILY_BOARD_SCORE_CAP,
  importFromEmail: DEFAULT_IMPORT_FROM_EMAIL
};

export function jobPreferenceFormFromQuery(data: JobPreferenceQueryResult): JobPreferenceFormState {
  return {
    workModes: data.workModes.filter(isWorkMode),
    locations: [...data.locations],
    remoteRegions: [...(data.remoteRegions ?? [])],
    roleKeywords: [...data.roleKeywords],
    excludeKeywords: [...data.excludeKeywords],
    salaryMin: data.salaryMin == null ? "" : String(data.salaryMin),
    salaryCurrency: (data.salaryCurrency ?? "").trim().toUpperCase(),
    levelFloor: data.levelFloor ?? "",
    minMatchScore: data.minMatchScore,
    titleId: data.titleId ?? "",
    customTitle: data.customTitle ?? "",
    jobsPerRun: data.jobsPerRun,
    dailyBoardScoreCap: data.dailyBoardScoreCap ?? DEFAULT_DAILY_BOARD_SCORE_CAP,
    importFromEmail: data.importFromEmail
  };
}

export function normalizeSalaryCurrencyInput(raw: string): string | null {
  const value = raw.trim().toUpperCase();
  if (!value) return null;
  return value.slice(0, 8);
}

export function salaryCurrencyOptions(current: string): Array<{ value: string; label: string }> {
  const extra = current.trim().toUpperCase();
  if (
    extra.length > 0 &&
    !JOB_PREFERENCE_SALARY_CURRENCY_OPTIONS.some((item) => item.value === extra)
  ) {
    return [...JOB_PREFERENCE_SALARY_CURRENCY_OPTIONS, { value: extra, label: extra }];
  }
  return JOB_PREFERENCE_SALARY_CURRENCY_OPTIONS;
}

export function leftoverRemoteRegionLocationTokens(locations: readonly string[]): string[] {
  return locations.filter((token) => {
    const slug = normalizeHiringRegion(token);
    if (slug == null) return false;
    if (slug === "worldwide") return true;
    return /\bremote\b/i.test(token);
  });
}

export function leftoverRemoteRegionsHint(tokens: readonly string[]): string {
  const quoted = tokens.map((token) => `“${token}”`).join(", ");
  const verb = tokens.length === 1 ? "looks" : "look";
  const pronoun = tokens.length === 1 ? "it" : "them";
  return `${quoted} ${verb} like a remote region. Move ${pronoun} to Remote regions.`;
}

export function isOpenJobPreferenceForm(value: JobPreferenceFormState): boolean {
  return isOpenJobPreference({
    workModes: value.workModes,
    locations: value.locations,
    remoteRegions: value.remoteRegions,
    roleKeywords: value.roleKeywords,
    excludeKeywords: value.excludeKeywords,
    salaryMin: parseOptionalMonthlyAmount(value.salaryMin),
    levelFloor: value.levelFloor === "" ? null : value.levelFloor
  });
}

export function jobPreferenceInputFromForm(
  value: JobPreferenceFormState
): UpsertJobPreferenceInput {
  const titleId = value.titleId === "" ? null : value.titleId;
  const customTitle = value.customTitle.trim();
  return {
    workModes: value.workModes,
    locations: normalizeTags(value.locations, 50, 120),
    remoteRegions: normalizeTags(value.remoteRegions, 50, 120),
    roleKeywords: normalizeTags(value.roleKeywords, 50, 120),
    excludeKeywords: normalizeTags(value.excludeKeywords, 50, 120),
    salaryMin: parseOptionalMonthlyAmount(value.salaryMin),
    salaryCurrency: normalizeSalaryCurrencyInput(value.salaryCurrency),
    levelFloor: value.levelFloor === "" ? null : value.levelFloor,
    minMatchScore: value.minMatchScore,
    titleId,
    customTitle: titleId === "custom" && customTitle.length > 0 ? customTitle : null,
    jobsPerRun: value.jobsPerRun,
    dailyBoardScoreCap: value.dailyBoardScoreCap,
    importFromEmail: value.importFromEmail
  };
}
