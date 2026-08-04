import { z } from "zod";

export const WorkModeSchema = z.enum(["remote", "hybrid", "onsite"]);
export type WorkMode = z.infer<typeof WorkModeSchema>;

const preferenceString = z.string().trim().min(1).max(120);

const preferenceStringList = z.array(preferenceString).max(50);

const salaryCurrencyField = z
  .string()
  .trim()
  .max(8)
  .nullable()
  .transform((v) => (v === "" || v == null ? null : v.toUpperCase()));

/**
 * Fully resolved preference body (no optional/default ambiguity).
 * Used for storage mapping, merge base, and API output fields.
 */
export const JobPreferenceFieldsSchema = z.object({
  workModes: z.array(WorkModeSchema).max(3),
  locations: preferenceStringList,
  roleKeywords: preferenceStringList,
  excludeKeywords: preferenceStringList,
  salaryMin: z.number().nonnegative().nullable(),
  salaryCurrency: z.string().nullable(),
  minMatchScore: z.number().int().min(0).max(100)
});
export type JobPreference = z.infer<typeof JobPreferenceFieldsSchema>;

/**
 * Parse-friendly shape with product defaults (task contract).
 * Prefer {@link JobPreferenceFieldsSchema} for resolved values.
 */
export const JobPreferenceSchema = z.object({
  workModes: z.array(WorkModeSchema).max(3).default([]),
  locations: preferenceStringList.default([]),
  roleKeywords: preferenceStringList.default([]),
  excludeKeywords: preferenceStringList.default([]),
  salaryMin: z.number().nonnegative().nullable().optional(),
  salaryCurrency: salaryCurrencyField.optional(),
  minMatchScore: z.number().int().min(0).max(100).default(60)
});

/** API get/upsert response. */
export const JobPreferenceOutputSchema = JobPreferenceFieldsSchema.extend({
  updatedAt: z.coerce.date().nullable()
});
export type JobPreferenceOutput = z.infer<typeof JobPreferenceOutputSchema>;

/** Partial upsert — omitted fields keep existing (or product defaults on first write). */
export const UpsertJobPreferenceInputSchema = z.object({
  workModes: z.array(WorkModeSchema).max(3).optional(),
  locations: preferenceStringList.optional(),
  roleKeywords: preferenceStringList.optional(),
  excludeKeywords: preferenceStringList.optional(),
  salaryMin: z.number().nonnegative().nullable().optional(),
  salaryCurrency: z
    .string()
    .trim()
    .max(8)
    .nullable()
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      if (v === "" || v == null) return null;
      return v.toUpperCase();
    }),
  minMatchScore: z.number().int().min(0).max(100).optional()
});
export type UpsertJobPreferenceInput = z.infer<typeof UpsertJobPreferenceInputSchema>;
