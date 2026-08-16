import { isBelowLevelFloor } from "./level";
import { findMatchingKeywords } from "./phrase-match";
import { comparableMonthlyPay, type SalaryPeriod } from "./salary-compare";
import { type LevelFloor } from "./types";

export type PreferenceHardFailJob = {
  title: string;
  companyName?: string | null;
  location?: string | null;
  description?: string | null;
  salaryRange?: string | null;
  salaryMin?: number | null;
  salaryCurrency?: string | null;
  salaryPeriod?: SalaryPeriod | null;
};

export type PreferenceHardFailPrefs = {
  excludeKeywords?: readonly string[] | null;
  salaryMin?: number | null;
  salaryCurrency?: string | null;
  levelFloor?: LevelFloor | null;
};

export type PreferenceHardFailResult = {
  failed: boolean;
  reasons: string[];
};

function excludeHaystack(job: PreferenceHardFailJob): string {
  return [job.title, job.companyName ?? "", job.location ?? "", job.description ?? ""]
    .join(" ")
    .trim();
}

/** Column hard-fails only. Do not call decideTwoAxis from here. */
export function applyPreferenceHardFails(
  job: PreferenceHardFailJob,
  prefs: PreferenceHardFailPrefs
): PreferenceHardFailResult {
  const reasons: string[] = [];
  const excludes = prefs.excludeKeywords ?? [];
  if (excludes.length > 0) {
    const hits = findMatchingKeywords(excludeHaystack(job), excludes);
    if (hits.length > 0) reasons.push("excluded keyword match");
  }

  if (isBelowLevelFloor(job.title, prefs.levelFloor)) {
    reasons.push("below level floor");
  }

  const floor = prefs.salaryMin;
  if (floor != null && Number.isFinite(floor)) {
    const stated = comparableMonthlyPay(job);
    const prefCurrency = prefs.salaryCurrency?.trim().toUpperCase() ?? "";
    if (stated && prefCurrency && stated.currency === prefCurrency && stated.monthly < floor) {
      reasons.push("below salary floor");
    }
  }

  return { failed: reasons.length > 0, reasons };
}
