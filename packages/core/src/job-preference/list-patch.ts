import { z } from "zod";

import { JobPreferenceFieldsSchema, WorkModeSchema, type JobPreference } from "./types";

const preferenceString = z.string().trim().min(1).max(120);
const preferenceStringList = z.array(preferenceString).max(50);

export const PreferenceListPatchSchema = z.object({
  op: z.enum(["add", "remove", "set"]),
  values: preferenceStringList
});
export type PreferenceListPatch = z.infer<typeof PreferenceListPatchSchema>;

const PREFERENCE_LIST_MAX = 50;

function uniquePreferenceList(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= PREFERENCE_LIST_MAX) break;
  }
  return out;
}

/** Apply add/remove/set. Never treat a one-item add as a replace. */
export function applyPreferenceListPatch(
  current: readonly string[],
  patch: PreferenceListPatch
): string[] {
  if (patch.op === "set") return uniquePreferenceList(patch.values);
  if (patch.op === "add") return uniquePreferenceList([...current, ...patch.values]);
  const remove = new Set(patch.values.map((value) => value.trim().toLowerCase()).filter(Boolean));
  return uniquePreferenceList(current.filter((value) => !remove.has(value.trim().toLowerCase())));
}

/** Immediate search-loop writes. Hard-stop keys are rejected (strict). */
export const UpsertSoftJobPreferencesInputSchema = z
  .object({
    roleKeywords: PreferenceListPatchSchema.optional(),
    workModes: z.array(WorkModeSchema).max(3).optional()
  })
  .strict()
  .refine((value) => value.roleKeywords !== undefined || value.workModes !== undefined, {
    message: "Provide at least one soft preference field"
  });
export type UpsertSoftJobPreferencesInput = z.infer<typeof UpsertSoftJobPreferencesInputSchema>;

export const UpsertSoftJobPreferencesOutputSchema = z.object({
  ok: z.boolean(),
  preferences: JobPreferenceFieldsSchema.nullable()
});
export type UpsertSoftJobPreferencesOutput = z.infer<typeof UpsertSoftJobPreferencesOutputSchema>;

const salaryCurrencyPatch = z
  .string()
  .trim()
  .max(8)
  .nullable()
  .transform((value) => (value === "" || value == null ? null : value.toUpperCase()));

export const ProposeHardPreferenceChangeInputSchema = z
  .object({
    salaryMin: z.number().nonnegative().nullable().optional(),
    salaryCurrency: salaryCurrencyPatch.optional()
  })
  .strict()
  .refine((value) => value.salaryMin !== undefined || value.salaryCurrency !== undefined, {
    message: "Propose at least one hard-stop field"
  });
export type ProposeHardPreferenceChangeInput = z.infer<
  typeof ProposeHardPreferenceChangeInputSchema
>;

export const ProposeHardPreferenceChangeOutputSchema = z.object({
  action: z.enum(["confirm", "cancel"]),
  patch: ProposeHardPreferenceChangeInputSchema.optional()
});
export type ProposeHardPreferenceChangeOutput = z.infer<
  typeof ProposeHardPreferenceChangeOutputSchema
>;

function sameStringList(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function jobPreferencesEqual(left: JobPreference, right: JobPreference): boolean {
  return (
    left.salaryMin === right.salaryMin &&
    left.salaryCurrency === right.salaryCurrency &&
    left.minMatchScore === right.minMatchScore &&
    left.dailyBoardScoreCap === right.dailyBoardScoreCap &&
    left.importFromEmail === right.importFromEmail &&
    left.reviewApplyKit === right.reviewApplyKit &&
    sameStringList(left.workModes, right.workModes) &&
    sameStringList(left.roleKeywords, right.roleKeywords)
  );
}

export function applySoftJobPreferencePatch(
  current: JobPreference,
  input: UpsertSoftJobPreferencesInput
): JobPreference {
  const roleKeywords = input.roleKeywords
    ? applyPreferenceListPatch(current.roleKeywords, input.roleKeywords)
    : undefined;
  return {
    ...current,
    workModes: input.workModes ?? current.workModes,
    roleKeywords: roleKeywords ?? current.roleKeywords
  };
}

/** Hard-stop next values; salary floor only since the catalog drop. */
export type HardPreferencePatch = {
  salaryMin?: number | null;
  salaryCurrency?: string | null;
};

export function applyHardJobPreferencePatch(
  _current: Pick<JobPreference, "salaryMin" | "salaryCurrency">,
  patch: ProposeHardPreferenceChangeInput
): HardPreferencePatch {
  const next: HardPreferencePatch = {};
  if (patch.salaryMin !== undefined) next.salaryMin = patch.salaryMin;
  if (patch.salaryCurrency !== undefined) {
    next.salaryCurrency =
      patch.salaryCurrency == null ? null : patch.salaryCurrency.trim().toUpperCase();
  }
  return next;
}

function formatSalaryFloor(min: number | null, currency: string | null): string {
  if (min == null) return "none";
  return currency ? `${min} ${currency}` : String(min);
}

export type HardPreferenceDeltaView = {
  summary: string;
  chips: string[];
  upsert: HardPreferencePatch;
};

export function describeHardPreferenceDelta(
  current: Pick<JobPreference, "salaryMin" | "salaryCurrency">,
  patch: ProposeHardPreferenceChangeInput
): HardPreferenceDeltaView {
  const upsert = applyHardJobPreferencePatch(current, patch);
  const lines: string[] = [];
  const chips: string[] = [];

  if (patch.salaryMin !== undefined || patch.salaryCurrency !== undefined) {
    const nextMin = upsert.salaryMin !== undefined ? upsert.salaryMin : current.salaryMin;
    const nextCurrency =
      upsert.salaryCurrency !== undefined ? upsert.salaryCurrency : current.salaryCurrency;
    if (nextMin == null && !nextCurrency) {
      lines.push("Clear salary floor");
    } else {
      lines.push(
        `Set minimum monthly: ${formatSalaryFloor(nextMin ?? null, nextCurrency ?? null)}`
      );
    }
    const salaryChip = formatSalaryFloor(nextMin ?? null, nextCurrency ?? null);
    if (salaryChip !== "none") chips.push(salaryChip);
  }

  return {
    summary: lines.join("\n"),
    chips: uniquePreferenceList(chips),
    upsert
  };
}
