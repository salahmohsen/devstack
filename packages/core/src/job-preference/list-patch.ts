import { z } from "zod";

import { JobTitleIdSchema } from "#@/job-discovery/constants";

import {
  JobPreferenceFieldsSchema,
  LevelFloorSchema,
  UpsertJobPreferenceInputSchema,
  WorkModeSchema,
  type JobPreference,
  type LevelFloor,
  type UpsertJobPreferenceInput
} from "./types";

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

const softCustomTitleField = z.string().trim().max(120).nullable();

/** Immediate search-loop writes. Hard-stop keys are rejected (strict). */
export const UpsertSoftJobPreferencesInputSchema = z
  .object({
    titleId: JobTitleIdSchema.nullable().optional(),
    customTitle: softCustomTitleField.optional(),
    roleKeywords: PreferenceListPatchSchema.optional(),
    workModes: z.array(WorkModeSchema).max(3).optional(),
    locations: PreferenceListPatchSchema.optional(),
    remoteRegions: PreferenceListPatchSchema.optional()
  })
  .strict();
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
    salaryCurrency: salaryCurrencyPatch.optional(),
    excludeKeywords: PreferenceListPatchSchema.optional(),
    levelFloor: LevelFloorSchema.nullable().optional()
  })
  .strict()
  .refine(
    (value) =>
      value.salaryMin !== undefined ||
      value.salaryCurrency !== undefined ||
      value.excludeKeywords !== undefined ||
      value.levelFloor !== undefined,
    { message: "Propose at least one hard-stop field" }
  );
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

export function applySoftJobPreferencePatch(
  current: JobPreference,
  input: UpsertSoftJobPreferencesInput
): JobPreference {
  const roleKeywords = input.roleKeywords
    ? applyPreferenceListPatch(current.roleKeywords, input.roleKeywords)
    : undefined;
  const locations = input.locations
    ? applyPreferenceListPatch(current.locations, input.locations)
    : undefined;
  const remoteRegions = input.remoteRegions
    ? applyPreferenceListPatch(current.remoteRegions, input.remoteRegions)
    : undefined;
  return {
    ...current,
    titleId: input.titleId !== undefined ? input.titleId : current.titleId,
    customTitle: input.customTitle !== undefined ? input.customTitle : current.customTitle,
    workModes: input.workModes ?? current.workModes,
    roleKeywords: roleKeywords ?? current.roleKeywords,
    locations: locations ?? current.locations,
    remoteRegions: remoteRegions ?? current.remoteRegions
  };
}

export function applyHardJobPreferencePatch(
  current: Pick<JobPreference, "excludeKeywords" | "salaryMin" | "salaryCurrency" | "levelFloor">,
  patch: ProposeHardPreferenceChangeInput
): UpsertJobPreferenceInput {
  const next: {
    excludeKeywords?: string[];
    salaryMin?: number | null;
    salaryCurrency?: string | null;
    levelFloor?: LevelFloor | null;
  } = {};
  if (patch.excludeKeywords) {
    next.excludeKeywords = applyPreferenceListPatch(current.excludeKeywords, patch.excludeKeywords);
  }
  if (patch.salaryMin !== undefined) next.salaryMin = patch.salaryMin;
  if (patch.salaryCurrency !== undefined) next.salaryCurrency = patch.salaryCurrency;
  if (patch.levelFloor !== undefined) next.levelFloor = patch.levelFloor;
  return UpsertJobPreferenceInputSchema.parse(next);
}

function formatExcludeList(values: readonly string[]): string {
  return values.length > 0 ? values.join(", ") : "none";
}

function formatLevelFloor(value: LevelFloor | null): string {
  return value ?? "none";
}

function formatSalaryFloor(min: number | null, currency: string | null): string {
  if (min == null) return "none";
  return currency ? `${min} ${currency}` : String(min);
}

export type HardPreferenceDeltaView = {
  summary: string;
  chips: string[];
  upsert: UpsertJobPreferenceInput;
};

export function describeHardPreferenceDelta(
  current: Pick<JobPreference, "excludeKeywords" | "salaryMin" | "salaryCurrency" | "levelFloor">,
  patch: ProposeHardPreferenceChangeInput
): HardPreferenceDeltaView {
  const upsert = applyHardJobPreferencePatch(current, patch);
  const lines: string[] = [];
  const chips: string[] = [];

  if (patch.excludeKeywords) {
    const next = upsert.excludeKeywords ?? current.excludeKeywords;
    const op = patch.excludeKeywords.op;
    const incoming = patch.excludeKeywords.values;
    if (op === "add") {
      lines.push(
        `Add exclude: ${incoming.join(", ") || "none"} — keep existing: ${formatExcludeList(current.excludeKeywords)}`
      );
    } else if (op === "remove") {
      lines.push(
        `Remove exclude: ${incoming.join(", ") || "none"} — keep: ${formatExcludeList(next)}`
      );
    } else {
      lines.push(
        `Set exclusions to: ${formatExcludeList(next)} — was: ${formatExcludeList(current.excludeKeywords)}`
      );
    }
    chips.push(...incoming);
  }

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

  if (patch.levelFloor !== undefined) {
    const next = upsert.levelFloor !== undefined ? upsert.levelFloor : current.levelFloor;
    if (next == null) {
      lines.push("Clear level floor");
    } else {
      lines.push(`Set level floor: ${formatLevelFloor(next)}`);
      chips.push(next);
    }
  }

  return {
    summary: lines.join("\n"),
    chips: uniquePreferenceList(chips),
    upsert
  };
}
