import { z } from "zod";

import {
  DEFAULT_DAILY_BOARD_SCORE_CAP,
  DEFAULT_JOBS_PER_RUN,
  JobTitleIdSchema,
  MAX_DAILY_BOARD_SCORE_CAP,
  MAX_JOBS_PER_RUN,
  MIN_DAILY_BOARD_SCORE_CAP,
  MIN_JOBS_PER_RUN,
  refineDailyBoardScoreCap,
  refineJobsPerRun
} from "#@/job-discovery/constants";
import {
  CategoryFacetSchema,
  CollectionFacetSchema,
  CompanySizeFacetSchema,
  CompanyTypeFacetSchema,
  CountryOrCitySchema,
  DomainFacetSchema,
  EmploymentTypeFacetSchema,
  RegionFacetSchema,
  RealityFacetSchema,
  SeniorityFacetSchema,
  WorkModeSchema
} from "#@/job-discovery/facets";

export { WorkModeSchema, type WorkMode } from "#@/job-discovery/facets";

export const LevelFloorSchema = z.enum(["junior", "mid", "senior", "staff"]);
export type LevelFloor = z.infer<typeof LevelFloorSchema>;

const preferenceString = z.string().trim().min(1).max(120);

const preferenceStringList = z.array(preferenceString).max(50);

const openFacetList = z.array(CountryOrCitySchema).max(50);

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

const dailyBoardScoreCapField = z
  .number()
  .int()
  .min(MIN_DAILY_BOARD_SCORE_CAP)
  .max(MAX_DAILY_BOARD_SCORE_CAP)
  .transform(refineDailyBoardScoreCap);

const customTitleField = z.string().trim().max(120).nullable();

/**
 * Legacy harvest/matching preference body (pre-freehire facets).
 * Kept for the harvest scorer, two-axis, and list-patch flows; the
 * facet-shaped {@link JobPreferenceOutputSchema} supersedes it for the
 * freehire discovery surface and is reworked in the scorer task.
 */
export const JobPreferenceFieldsSchema = z.object({
  workModes: z.array(WorkModeSchema).max(3),
  locations: preferenceStringList,
  remoteRegions: preferenceStringList,
  roleKeywords: preferenceStringList,
  excludeKeywords: preferenceStringList,
  salaryMin: z.number().nonnegative().nullable(),
  salaryCurrency: z.string().nullable(),
  levelFloor: LevelFloorSchema.nullable(),
  minMatchScore: z.number().int().min(0).max(100),
  titleId: JobTitleIdSchema.nullable(),
  customTitle: customTitleField,
  jobsPerRun: jobsPerRunField,
  dailyBoardScoreCap: dailyBoardScoreCapField,
  importFromEmail: z.boolean(),
  reviewApplyKit: z.boolean()
});
export type JobPreference = z.infer<typeof JobPreferenceFieldsSchema>;

/**
 * Parse-friendly shape with product defaults (task contract).
 * Prefer {@link JobPreferenceFieldsSchema} for resolved values.
 */
export const JobPreferenceSchema = z.object({
  workModes: z.array(WorkModeSchema).max(3).default([]),
  locations: preferenceStringList.default([]),
  remoteRegions: preferenceStringList.default([]),
  roleKeywords: preferenceStringList.default([]),
  excludeKeywords: preferenceStringList.default([]),
  salaryMin: z.number().nonnegative().nullable().optional(),
  salaryCurrency: salaryCurrencyField.optional(),
  levelFloor: LevelFloorSchema.nullable().default(null),
  minMatchScore: z.number().int().min(0).max(100).default(60),
  titleId: JobTitleIdSchema.nullable().default(null),
  customTitle: customTitleField.default(null),
  jobsPerRun: jobsPerRunField.default(DEFAULT_JOBS_PER_RUN),
  dailyBoardScoreCap: dailyBoardScoreCapField.default(DEFAULT_DAILY_BOARD_SCORE_CAP),
  importFromEmail: z.boolean().default(false),
  reviewApplyKit: z.boolean().default(true)
});

/** API get/upsert response — freehire facet-shaped. Null facet = unset. */
export const JobPreferenceOutputSchema = z.object({
  workModes: z.array(WorkModeSchema).max(3),
  regions: z.array(RegionFacetSchema).nullable(),
  countries: openFacetList.nullable(),
  cities: openFacetList.nullable(),
  roleKeywords: preferenceStringList,
  categories: z.array(CategoryFacetSchema).nullable(),
  skills: openFacetList.nullable(),
  seniority: z.array(SeniorityFacetSchema).nullable(),
  experienceYearsMin: z.number().int().nullable(),
  experienceYearsMax: z.number().int().nullable(),
  salaryMin: z.number().nonnegative().nullable(),
  salaryCurrency: z.string().nullable(),
  employmentTypes: z.array(EmploymentTypeFacetSchema).nullable(),
  companyTypes: z.array(CompanyTypeFacetSchema).nullable(),
  companySizes: z.array(CompanySizeFacetSchema).nullable(),
  domains: z.array(DomainFacetSchema).nullable(),
  collections: z.array(CollectionFacetSchema).nullable(),
  reality: z.array(RealityFacetSchema).nullable(),
  openWithinDays: z.number().int().positive().nullable(),
  visaSponsorship: z.boolean().nullable(),
  requiresClearance: z.boolean().nullable(),
  minMatchScore: z.number().int().min(0).max(100),
  dailyBoardScoreCap: dailyBoardScoreCapField,
  importFromEmail: z.boolean(),
  reviewApplyKit: z.boolean(),
  updatedAt: z.coerce.date().nullable(),
  /** Board-search AI scores already consumed this UTC day. Not a form field. */
  boardScoresUsedToday: z.number().int().nonnegative()
});
export type JobPreferenceOutput = z.infer<typeof JobPreferenceOutputSchema>;

export const ResetBoardScoresTodayOutputSchema = z.object({
  boardScoresUsedToday: z.literal(0)
});
export type ResetBoardScoresTodayOutput = z.infer<typeof ResetBoardScoresTodayOutputSchema>;

/** Partial upsert — omitted fields keep existing (or product defaults on first write). */
export const UpsertJobPreferenceInputSchema = z.object({
  workModes: z.array(WorkModeSchema).max(3).optional(),
  regions: z.array(RegionFacetSchema).optional(),
  countries: openFacetList.optional(),
  cities: openFacetList.optional(),
  roleKeywords: preferenceStringList.optional(),
  categories: z.array(CategoryFacetSchema).optional(),
  skills: openFacetList.optional(),
  seniority: z.array(SeniorityFacetSchema).optional(),
  experienceYearsMin: z.number().int().nullable().optional(),
  experienceYearsMax: z.number().int().nullable().optional(),
  salaryMin: z.number().nonnegative().nullable().optional(),
  salaryCurrency: salaryCurrencyField.optional(),
  employmentTypes: z.array(EmploymentTypeFacetSchema).optional(),
  companyTypes: z.array(CompanyTypeFacetSchema).optional(),
  companySizes: z.array(CompanySizeFacetSchema).optional(),
  domains: z.array(DomainFacetSchema).optional(),
  collections: z.array(CollectionFacetSchema).optional(),
  reality: z.array(RealityFacetSchema).optional(),
  openWithinDays: z.number().int().positive().nullable().optional(),
  visaSponsorship: z.boolean().nullable().optional(),
  requiresClearance: z.boolean().nullable().optional(),
  minMatchScore: z.number().int().min(0).max(100).optional(),
  dailyBoardScoreCap: dailyBoardScoreCapField.optional(),
  importFromEmail: z.boolean().optional(),
  reviewApplyKit: z.boolean().optional()
});
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
