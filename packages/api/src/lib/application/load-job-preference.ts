import {
  DEFAULT_MIN_MATCH_SCORE,
  defaultJobPreference,
  defaultJobPreferenceOutput,
  refineDailyBoardScoreCap,
  type JobPreference,
  type JobPreferenceFacetFields,
  type JobPreferenceOutput,
  type WorkMode
} from "@tsu-stack/core";
import { jobPreferenceRepository } from "@tsu-stack/db";

/** DB facet columns are plain jsonb string[] — recast to the facet-typed shape. */
function facetsFromRow(row: Awaited<ReturnType<typeof jobPreferenceRepository.findByUserId>>) {
  return {
    regions: row?.regions,
    countries: row?.countries,
    cities: row?.cities,
    categories: row?.categories,
    skills: row?.skills,
    seniority: row?.seniority,
    experienceYearsMin: row?.experienceYearsMin,
    experienceYearsMax: row?.experienceYearsMax,
    employmentTypes: row?.employmentTypes,
    companyTypes: row?.companyTypes,
    companySizes: row?.companySizes,
    domains: row?.domains,
    collections: row?.collections,
    openWithinDays: row?.openWithinDays,
    reality: row?.reality,
    visaSponsorship: row?.visaSponsorship,
    requiresClearance: row?.requiresClearance
  } satisfies Record<string, unknown> as Partial<JobPreferenceFacetFields>;
}

export async function loadJobPreference(userId: string): Promise<JobPreference> {
  const row = await jobPreferenceRepository.findByUserId(userId);
  if (!row) return defaultJobPreference();
  return {
    workModes: row.workModes ?? [],
    roleKeywords: row.roleKeywords ?? [],
    salaryMin: row.salaryMin,
    salaryCurrency: row.salaryCurrency,
    minMatchScore: row.minMatchScore ?? DEFAULT_MIN_MATCH_SCORE,
    dailyBoardScoreCap: row.dailyBoardScoreCap ?? 50,
    importFromEmail: row.importFromEmail ?? false,
    reviewApplyKit: row.reviewApplyKit ?? true,
    ...facetsFromRow(row)
  };
}

/**
 * Facet-shaped preference for the freehire discovery pipeline (land / inbox AI).
 * `boardScoresUsedToday` is a response-only field on the API surface — loaders
 * read the budget repository directly, so it stays 0 here.
 */
export async function loadJobPreferenceOutput(userId: string): Promise<JobPreferenceOutput> {
  const row = await jobPreferenceRepository.findByUserId(userId);
  if (!row) return defaultJobPreferenceOutput();
  return {
    workModes: (row.workModes ?? []) as WorkMode[],
    regions: row.regions as JobPreferenceOutput["regions"],
    countries: row.countries,
    cities: row.cities,
    roleKeywords: row.roleKeywords ?? [],
    categories: row.categories as JobPreferenceOutput["categories"],
    skills: row.skills,
    seniority: row.seniority as JobPreferenceOutput["seniority"],
    experienceYearsMin: row.experienceYearsMin ?? null,
    experienceYearsMax: row.experienceYearsMax ?? null,
    salaryMin: row.salaryMin ?? null,
    salaryCurrency: row.salaryCurrency ?? null,
    employmentTypes: row.employmentTypes as JobPreferenceOutput["employmentTypes"],
    companyTypes: row.companyTypes as JobPreferenceOutput["companyTypes"],
    companySizes: row.companySizes as JobPreferenceOutput["companySizes"],
    domains: row.domains as JobPreferenceOutput["domains"],
    collections: row.collections as JobPreferenceOutput["collections"],
    reality: row.reality as JobPreferenceOutput["reality"],
    openWithinDays: row.openWithinDays ?? null,
    visaSponsorship: row.visaSponsorship ?? null,
    requiresClearance: row.requiresClearance ?? null,
    minMatchScore: row.minMatchScore ?? DEFAULT_MIN_MATCH_SCORE,
    dailyBoardScoreCap: refineDailyBoardScoreCap(row.dailyBoardScoreCap ?? 50),
    importFromEmail: row.importFromEmail ?? false,
    reviewApplyKit: row.reviewApplyKit ?? true,
    updatedAt: row.updatedAt,
    boardScoresUsedToday: 0
  };
}
