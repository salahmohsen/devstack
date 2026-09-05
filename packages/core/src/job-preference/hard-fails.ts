import { comparableMonthlyPay, type SalaryPeriod } from "./salary-compare";

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
  salaryMin?: number | null;
  salaryCurrency?: string | null;
};

export type PreferenceHardFailResult = {
  failed: boolean;
  reasons: string[];
};

export function applyPreferenceHardFails(
  job: PreferenceHardFailJob,
  prefs: PreferenceHardFailPrefs
): PreferenceHardFailResult {
  const reasons: string[] = [];

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
