import { z } from "zod";

import {
  CATEGORY_FACET_VALUES,
  CategoryFacetSchema,
  COLLECTION_FACET_VALUES,
  CollectionFacetSchema,
  CompanySizeFacetSchema,
  CompanyTypeFacetSchema,
  DEFAULT_DAILY_BOARD_SCORE_CAP,
  DEFAULT_IMPORT_FROM_EMAIL,
  DEFAULT_MIN_MATCH_SCORE,
  DEFAULT_REVIEW_APPLY_KIT,
  DOMAIN_FACET_VALUES,
  DomainFacetSchema,
  EmploymentTypeFacetSchema,
  isWorkMode,
  isOpenJobPreference,
  JobPreferenceFieldsSchema,
  RegionFacetSchema,
  RealityFacetSchema,
  SALARY_CURRENCIES,
  SeniorityFacetSchema,
  WORK_MODES,
  WORK_MODE_LABELS,
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

/** Facet lists are optional: an empty selection is stored as null (unset). */
function orUnset<T>(values: readonly T[]): T[] | null {
  return values.length > 0 ? [...values] : null;
}

function optionalIntegerField(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^\d{1,3}$/.test(trimmed)) return null;
  return Number(trimmed);
}

/** Tri-state facet select: the form keeps a string, the API gets null/true/false. */
export type TriStateFacet = "unset" | "true" | "false";

function triStateToBoolean(value: TriStateFacet): boolean | null {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function booleanToTriState(value: boolean | null | undefined): TriStateFacet {
  if (value === true) return "true";
  if (value === false) return "false";
  return "unset";
}

const yearsField = z
  .string()
  .trim()
  .max(3)
  .refine((value) => value === "" || /^\d{1,3}$/.test(value), "Enter whole years or leave empty");

const daysField = z
  .string()
  .trim()
  .max(4)
  .refine((value) => value === "" || /^\d{1,4}$/.test(value), "Enter whole days or leave empty")
  .refine((value) => value === "" || Number(value) >= 1, "Enter at least 1 day");

const openFacetList = z.array(z.string().trim().min(1).max(120)).max(50);

export const JobPreferenceFormSchema = JobPreferenceFieldsSchema.pick({
  workModes: true,
  roleKeywords: true,
  minMatchScore: true,
  dailyBoardScoreCap: true,
  importFromEmail: true,
  reviewApplyKit: true
})
  .extend({
    regions: z.array(RegionFacetSchema),
    countries: openFacetList,
    cities: openFacetList,
    roleKeywords: z.array(z.string().trim().min(1).max(120)).max(50),
    categories: z.array(CategoryFacetSchema),
    skills: openFacetList,
    seniority: z.array(SeniorityFacetSchema),
    experienceYearsMin: yearsField,
    experienceYearsMax: yearsField,
    employmentTypes: z.array(EmploymentTypeFacetSchema),
    companyTypes: z.array(CompanyTypeFacetSchema),
    companySizes: z.array(CompanySizeFacetSchema),
    domains: z.array(DomainFacetSchema),
    collections: z.array(CollectionFacetSchema),
    reality: z.array(RealityFacetSchema),
    openWithinDays: daysField,
    salaryMin: z
      .string()
      .trim()
      .max(10)
      .refine(
        (value) => value === "" || parseOptionalMonthlyAmount(value) != null,
        "Enter a whole monthly amount or leave empty"
      ),
    salaryCurrency: z.string().trim().max(8),
    visaSponsorship: z.enum(["unset", "true", "false"]),
    requiresClearance: z.enum(["unset", "true", "false"])
  })
  .superRefine((value, ctx) => {
    if (parseOptionalMonthlyAmount(value.salaryMin) == null) return;
    if (value.salaryCurrency.trim() !== "") return;
    ctx.addIssue({
      code: "custom",
      path: ["salaryCurrency"],
      message: "Select a currency for the monthly floor"
    });
  });

const FACET_LABEL_OVERRIDES: Readonly<Record<string, string>> = {
  ai: "AI",
  ai_engineering: "AI engineering",
  ai_native: "AI-native",
  apac: "APAC",
  c_level: "C-level",
  cis: "CIS",
  climatetech: "ClimateTech",
  crypto: "Crypto",
  devops: "DevOps",
  devtools: "DevTools",
  ecommerce: "E-commerce",
  edtech: "EdTech",
  fintech: "Fintech",
  fullstack: "Full-stack",
  gamedev: "Game dev",
  govtech: "GovTech",
  hr: "HR",
  hrtech: "HR tech",
  latam: "LatAm",
  mag7: "Mag 7",
  mena: "MENA",
  ml_ai: "ML / AI",
  qa: "QA",
  sre: "SRE",
  yc: "YC"
};

/** snake_case / kebab-case facet value → Title Case label; numeric ranges stay literal. */
export function facetLabel(value: string): string {
  const override = FACET_LABEL_OVERRIDES[value];
  if (override) return override;
  if (/^\d/.test(value)) return value;
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const REGION_LABEL_EXTRA: Readonly<Record<string, string>> = { eu: "EU", uk: "UK" };
function labelFor(value: string): string {
  return REGION_LABEL_EXTRA[value] ?? facetLabel(value);
}

function facetOptions(values: readonly string[]): Array<{ value: string; label: string }> {
  return values.map((value) => {
    return { value, label: labelFor(value) };
  });
}

export const JOB_PREFERENCE_WORK_MODE_OPTIONS = WORK_MODES.map((mode) => {
  return {
    value: mode,
    label: WORK_MODE_LABELS[mode]
  };
});

export const JOB_PREFERENCE_REGION_OPTIONS = facetOptions(RegionFacetSchema.options);

export const JOB_PREFERENCE_SENIORITY_OPTIONS = facetOptions(SeniorityFacetSchema.options);

export const JOB_PREFERENCE_EMPLOYMENT_TYPE_OPTIONS = facetOptions(
  EmploymentTypeFacetSchema.options
);

export const JOB_PREFERENCE_COMPANY_TYPE_OPTIONS = facetOptions(CompanyTypeFacetSchema.options);

export const JOB_PREFERENCE_COMPANY_SIZE_OPTIONS = CompanySizeFacetSchema.options.map((size) => {
  return { value: size, label: size };
});

export const JOB_PREFERENCE_CATEGORY_OPTIONS = facetOptions(CATEGORY_FACET_VALUES);

export const JOB_PREFERENCE_DOMAIN_OPTIONS = facetOptions(DOMAIN_FACET_VALUES);

export const JOB_PREFERENCE_COLLECTION_OPTIONS = facetOptions(COLLECTION_FACET_VALUES);

export const JOB_PREFERENCE_REALITY_OPTIONS = facetOptions(RealityFacetSchema.options);

export const JOB_PREFERENCE_SALARY_CURRENCY_OPTIONS = SALARY_CURRENCIES.map((code) => {
  return {
    value: code,
    label: code
  };
});

export const JOB_PREFERENCE_TRI_STATE_OPTIONS = [
  { value: "unset", label: "No preference" },
  { value: "true", label: "Yes" },
  { value: "false", label: "No" }
] as const satisfies ReadonlyArray<{ value: TriStateFacet; label: string }>;

type Region = (typeof RegionFacetSchema.options)[number];
type Category = (typeof CATEGORY_FACET_VALUES)[number];
type Seniority = (typeof SeniorityFacetSchema.options)[number];
type EmploymentType = (typeof EmploymentTypeFacetSchema.options)[number];
type CompanyType = (typeof CompanyTypeFacetSchema.options)[number];
type CompanySize = (typeof CompanySizeFacetSchema.options)[number];
type Domain = (typeof DOMAIN_FACET_VALUES)[number];
type Collection = (typeof COLLECTION_FACET_VALUES)[number];
type Reality = (typeof RealityFacetSchema.options)[number];

export type JobPreferenceFormState = {
  regions: Region[];
  countries: string[];
  cities: string[];
  roleKeywords: string[];
  categories: Category[];
  skills: string[];
  seniority: Seniority[];
  experienceYearsMin: string;
  experienceYearsMax: string;
  workModes: WorkMode[];
  employmentTypes: EmploymentType[];
  salaryMin: string;
  salaryCurrency: string;
  visaSponsorship: TriStateFacet;
  requiresClearance: TriStateFacet;
  companyTypes: CompanyType[];
  companySizes: CompanySize[];
  domains: Domain[];
  collections: Collection[];
  openWithinDays: string;
  reality: Reality[];
  minMatchScore: number;
  dailyBoardScoreCap: number;
  importFromEmail: boolean;
  reviewApplyKit: boolean;
};

export const emptyJobPreferenceForm: JobPreferenceFormState = {
  regions: [],
  countries: [],
  cities: [],
  roleKeywords: [],
  categories: [],
  skills: [],
  seniority: [],
  experienceYearsMin: "",
  experienceYearsMax: "",
  workModes: [],
  employmentTypes: [],
  salaryMin: "",
  salaryCurrency: "",
  visaSponsorship: "unset",
  requiresClearance: "unset",
  companyTypes: [],
  companySizes: [],
  domains: [],
  collections: [],
  openWithinDays: "",
  reality: [],
  minMatchScore: DEFAULT_MIN_MATCH_SCORE,
  dailyBoardScoreCap: DEFAULT_DAILY_BOARD_SCORE_CAP,
  importFromEmail: DEFAULT_IMPORT_FROM_EMAIL,
  reviewApplyKit: DEFAULT_REVIEW_APPLY_KIT
};

export function jobPreferenceFormFromQuery(data: JobPreferenceQueryResult): JobPreferenceFormState {
  return {
    regions: [...(data.regions ?? [])],
    countries: [...(data.countries ?? [])],
    cities: [...(data.cities ?? [])],
    roleKeywords: [...data.roleKeywords],
    categories: [...(data.categories ?? [])],
    skills: [...(data.skills ?? [])],
    seniority: [...(data.seniority ?? [])],
    experienceYearsMin: data.experienceYearsMin == null ? "" : String(data.experienceYearsMin),
    experienceYearsMax: data.experienceYearsMax == null ? "" : String(data.experienceYearsMax),
    workModes: data.workModes.filter(isWorkMode),
    employmentTypes: [...(data.employmentTypes ?? [])],
    salaryMin: data.salaryMin == null ? "" : String(data.salaryMin),
    salaryCurrency: (data.salaryCurrency ?? "").trim().toUpperCase(),
    visaSponsorship: booleanToTriState(data.visaSponsorship),
    requiresClearance: booleanToTriState(data.requiresClearance),
    companyTypes: [...(data.companyTypes ?? [])],
    companySizes: [...(data.companySizes ?? [])],
    domains: [...(data.domains ?? [])],
    collections: [...(data.collections ?? [])],
    openWithinDays: data.openWithinDays == null ? "" : String(data.openWithinDays),
    reality: [...(data.reality ?? [])],
    minMatchScore: data.minMatchScore,
    dailyBoardScoreCap: data.dailyBoardScoreCap ?? DEFAULT_DAILY_BOARD_SCORE_CAP,
    importFromEmail: data.importFromEmail,
    reviewApplyKit: data.reviewApplyKit ?? DEFAULT_REVIEW_APPLY_KIT
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

export function isOpenJobPreferenceForm(value: JobPreferenceFormState): boolean {
  return isOpenJobPreference({
    workModes: value.workModes,
    roleKeywords: value.roleKeywords,
    salaryMin: parseOptionalMonthlyAmount(value.salaryMin),
    regions: orUnset(value.regions),
    countries: orUnset(value.countries),
    cities: orUnset(value.cities),
    categories: orUnset(value.categories),
    skills: orUnset(value.skills),
    seniority: orUnset(value.seniority),
    experienceYearsMin: optionalIntegerField(value.experienceYearsMin),
    experienceYearsMax: optionalIntegerField(value.experienceYearsMax),
    employmentTypes: orUnset(value.employmentTypes),
    companyTypes: orUnset(value.companyTypes),
    companySizes: orUnset(value.companySizes),
    domains: orUnset(value.domains),
    collections: orUnset(value.collections),
    openWithinDays: optionalIntegerField(value.openWithinDays),
    reality: orUnset(value.reality),
    visaSponsorship: triStateToBoolean(value.visaSponsorship),
    requiresClearance: triStateToBoolean(value.requiresClearance)
  });
}

export function jobPreferenceInputFromForm(
  value: JobPreferenceFormState
): UpsertJobPreferenceInput {
  return {
    workModes: value.workModes,
    regions: orUnset(value.regions),
    countries: orUnset(normalizeTags(value.countries, 50, 120)),
    cities: orUnset(normalizeTags(value.cities, 50, 120)),
    roleKeywords: normalizeTags(value.roleKeywords, 50, 120),
    categories: orUnset(value.categories),
    skills: orUnset(normalizeTags(value.skills, 50, 120)),
    seniority: orUnset(value.seniority),
    experienceYearsMin: optionalIntegerField(value.experienceYearsMin),
    experienceYearsMax: optionalIntegerField(value.experienceYearsMax),
    employmentTypes: orUnset(value.employmentTypes),
    companyTypes: orUnset(value.companyTypes),
    companySizes: orUnset(value.companySizes),
    domains: orUnset(value.domains),
    collections: orUnset(value.collections),
    reality: orUnset(value.reality),
    openWithinDays: optionalIntegerField(value.openWithinDays),
    salaryMin: parseOptionalMonthlyAmount(value.salaryMin),
    salaryCurrency: normalizeSalaryCurrencyInput(value.salaryCurrency),
    visaSponsorship: triStateToBoolean(value.visaSponsorship),
    requiresClearance: triStateToBoolean(value.requiresClearance),
    minMatchScore: value.minMatchScore,
    dailyBoardScoreCap: value.dailyBoardScoreCap,
    importFromEmail: value.importFromEmail,
    reviewApplyKit: value.reviewApplyKit
  };
}
