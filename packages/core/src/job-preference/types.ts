import { z } from "zod";

import {
  DEFAULT_DAILY_BOARD_SCORE_CAP,
  MAX_DAILY_BOARD_SCORE_CAP,
  MIN_DAILY_BOARD_SCORE_CAP,
  refineDailyBoardScoreCap
} from "#@/job-discovery/constants";
import {
  CategoryFacetSchema,
  CollectionFacetSchema,
  CompanySizeFacetSchema,
  CompanyTypeFacetSchema,
  DomainFacetSchema,
  EmploymentTypeFacetSchema,
  RegionFacetSchema,
  RealityFacetSchema,
  OpenFacetValueSchema,
  SeniorityFacetSchema,
  WorkModeSchema
} from "#@/job-discovery/facets";

export { WorkModeSchema, type WorkMode } from "#@/job-discovery/facets";

const preferenceString = z.string().trim().min(1).max(120);

const preferenceStringList = z.array(preferenceString).max(50);

const openFacetList = z.array(OpenFacetValueSchema).max(50);

const salaryCurrencyField = z
  .string()
  .trim()
  .max(8)
  .nullable()
  .transform((v) => (v === "" || v == null ? null : v.toUpperCase()));

const dailyBoardScoreCapField = z
  .number()
  .int()
  .min(MIN_DAILY_BOARD_SCORE_CAP)
  .max(MAX_DAILY_BOARD_SCORE_CAP)
  .transform(refineDailyBoardScoreCap);

/**
 * Harvest/matching preference body shared by the scorer, two-axis, and
 * list-patch flows. The facet-shaped {@link JobPreferenceOutputSchema}
 * supersedes it for the freehire discovery surface.
 */
export const JobPreferenceFieldsSchema = z.object({
  workModes: z.array(WorkModeSchema).max(3),
  roleKeywords: preferenceStringList,
  salaryMin: z.number().nonnegative().nullable(),
  salaryCurrency: z.string().nullable(),
  minMatchScore: z.number().int().min(0).max(100),
  dailyBoardScoreCap: dailyBoardScoreCapField,
  importFromEmail: z.boolean(),
  reviewApplyKit: z.boolean()
});
export type JobPreference = z.infer<typeof JobPreferenceFieldsSchema> &
  Partial<JobPreferenceFacetFields>;

/**
 * Parse-friendly shape with product defaults (task contract).
 * Prefer {@link JobPreferenceFieldsSchema} for resolved values.
 */
export const JobPreferenceSchema = z.object({
  workModes: z.array(WorkModeSchema).max(3).default([]),
  roleKeywords: preferenceStringList.default([]),
  salaryMin: z.number().nonnegative().nullable().optional(),
  salaryCurrency: salaryCurrencyField.optional(),
  minMatchScore: z.number().int().min(0).max(100).default(60),
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

/** Facet-only slice shared by upsert merge and persistence mapping. */
export type JobPreferenceFacetFields = Pick<
  JobPreferenceOutput,
  | "regions"
  | "countries"
  | "cities"
  | "categories"
  | "skills"
  | "seniority"
  | "experienceYearsMin"
  | "experienceYearsMax"
  | "employmentTypes"
  | "companyTypes"
  | "companySizes"
  | "domains"
  | "collections"
  | "reality"
  | "openWithinDays"
  | "visaSponsorship"
  | "requiresClearance"
>;

export const ResetBoardScoresTodayOutputSchema = z.object({
  boardScoresUsedToday: z.literal(0)
});
export type ResetBoardScoresTodayOutput = z.infer<typeof ResetBoardScoresTodayOutputSchema>;

/** Partial upsert — omitted fields keep existing (or product defaults on first write). */
export const UpsertJobPreferenceInputSchema = z.object({
  workModes: z.array(WorkModeSchema).max(3).optional(),
  regions: z.array(RegionFacetSchema).nullish(),
  countries: openFacetList.nullish(),
  cities: openFacetList.nullish(),
  roleKeywords: preferenceStringList.optional(),
  categories: z.array(CategoryFacetSchema).nullish(),
  skills: openFacetList.nullish(),
  seniority: z.array(SeniorityFacetSchema).nullish(),
  experienceYearsMin: z.number().int().nullable().optional(),
  experienceYearsMax: z.number().int().nullable().optional(),
  salaryMin: z.number().nonnegative().nullable().optional(),
  salaryCurrency: salaryCurrencyField.optional(),
  employmentTypes: z.array(EmploymentTypeFacetSchema).nullish(),
  companyTypes: z.array(CompanyTypeFacetSchema).nullish(),
  companySizes: z.array(CompanySizeFacetSchema).nullish(),
  domains: z.array(DomainFacetSchema).nullish(),
  collections: z.array(CollectionFacetSchema).nullish(),
  reality: z.array(RealityFacetSchema).nullish(),
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
