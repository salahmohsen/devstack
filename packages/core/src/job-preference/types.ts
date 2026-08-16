import { z } from "zod";

import {
  DEFAULT_JOBS_PER_RUN,
  JobTitleIdSchema,
  MAX_JOBS_PER_RUN,
  MIN_JOBS_PER_RUN,
  refineJobsPerRun
} from "#@/job-discovery/constants";
import { refineCustomDiscoveryTitle } from "#@/job-discovery/title-packs";

export const WorkModeSchema = z.enum(["remote", "hybrid", "onsite"]);
export type WorkMode = z.infer<typeof WorkModeSchema>;

export const LevelFloorSchema = z.enum(["junior", "mid", "senior", "staff"]);
export type LevelFloor = z.infer<typeof LevelFloorSchema>;

const preferenceString = z.string().trim().min(1).max(120);

const preferenceStringList = z.array(preferenceString).max(50);

const salaryCurrencyField = z
  .string()
  .trim()
  .max(8)
  .nullable()
  .transform((v) => (v === "" || v == null ? null : v.toUpperCase()));

const jobsPerRunField = z
  .number()
  .int()
  .min(MIN_JOBS_PER_RUN)
  .max(MAX_JOBS_PER_RUN)
  .transform(refineJobsPerRun);

const customTitleField = z.string().trim().max(120).nullable();

/**
 * Fully resolved preference body (no optional/default ambiguity).
 * Used for storage mapping, merge base, and API output fields.
 *
 * `workModes` is multi-select (0–3 values). Empty = no work-mode filter.
 * Match semantics elsewhere treat the array as OR (any preferred mode).
 */
export const JobPreferenceFieldsSchema = z.object({
  workModes: z.array(WorkModeSchema).max(3),
  locations: preferenceStringList,
  roleKeywords: preferenceStringList,
  excludeKeywords: preferenceStringList,
  salaryMin: z.number().nonnegative().nullable(),
  salaryCurrency: z.string().nullable(),
  minMatchScore: z.number().int().min(0).max(100),
  titleId: JobTitleIdSchema.nullable(),
  customTitle: customTitleField,
  jobsPerRun: jobsPerRunField,
  importFromEmail: z.boolean()
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
  minMatchScore: z.number().int().min(0).max(100).default(60),
  titleId: JobTitleIdSchema.nullable().default(null),
  customTitle: customTitleField.default(null),
  jobsPerRun: jobsPerRunField.default(DEFAULT_JOBS_PER_RUN),
  importFromEmail: z.boolean().default(false)
});

/** API get/upsert response. */
export const JobPreferenceOutputSchema = JobPreferenceFieldsSchema.extend({
  updatedAt: z.coerce.date().nullable()
});
export type JobPreferenceOutput = z.infer<typeof JobPreferenceOutputSchema>;

/** Partial upsert — omitted fields keep existing (or product defaults on first write). */
export const UpsertJobPreferenceInputSchema = z
  .object({
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
    minMatchScore: z.number().int().min(0).max(100).optional(),
    titleId: JobTitleIdSchema.nullable().optional(),
    customTitle: customTitleField.optional(),
    jobsPerRun: jobsPerRunField.optional(),
    importFromEmail: z.boolean().optional()
  })
  .superRefine(refineCustomDiscoveryTitle);
export type UpsertJobPreferenceInput = z.infer<typeof UpsertJobPreferenceInputSchema>;

/**
 * Compact career-profile signal used when scoring harvested jobs.
 * Preferences stay the explicit filter; this fills gaps when role keywords
 * are empty so New jobs still match the seeker's actual craft.
 */
export const SeekerMatchEvidenceSchema = z.object({
  roleTitles: z.array(z.string().trim().min(1).max(160)).max(24).default([]),
  organizations: z.array(z.string().trim().min(1).max(160)).max(24).default([]),
  stackNames: z.array(z.string().trim().min(1).max(80)).max(60).default([]),
  featuredStackNames: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  projectTitles: z.array(z.string().trim().min(1).max(160)).max(24).default([])
});
export type SeekerMatchEvidence = z.infer<typeof SeekerMatchEvidenceSchema>;
