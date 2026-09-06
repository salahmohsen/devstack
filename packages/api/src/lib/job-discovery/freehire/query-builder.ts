import { type z } from "zod";

import {
  DISCOVERY_FETCH_POOL_SIZE,
  FACET_KEY_TO_WIRE,
  FACETS,
  OpenFacetValueSchema,
  SalaryCurrencySchema,
  preferenceQueryHash,
  type FacetKey,
  type JobPreferenceOutput
} from "@tsu-stack/core";

/** Filter record actually sent — hashed into `user_job.query_hash` for shelf invalidation. */
export type FreehireQueryFilters = Record<string, unknown>;

export type FreehireQuery = {
  params: URLSearchParams;
  filters: FreehireQueryFilters;
  hash: string;
  /** Off-whitelist facet values that were dropped instead of sent (freehire silently zero-results them). */
  dropped: string[];
};

const FACET_SCHEMAS: Record<FacetKey, z.ZodType<string>> = {
  regions: FACETS.regions,
  countries: OpenFacetValueSchema,
  cities: OpenFacetValueSchema,
  categories: FACETS.category,
  skills: OpenFacetValueSchema,
  seniority: FACETS.seniority,
  employmentTypes: FACETS.employment_type,
  companyTypes: FACETS.company_type,
  companySizes: FACETS.company_size,
  domains: FACETS.domains,
  collections: FACETS.collections,
  reality: FACETS.reality
};

/**
 * Preference facets → freehire `/agent/jobs/search` params. Array values join
 * with "," (freehire OR-widens). Geography facets all send when any is set —
 * freehire treats regions/countries/cities as one OR place group.
 */
export async function buildFreehireQuery(prefs: JobPreferenceOutput): Promise<FreehireQuery> {
  const params = new URLSearchParams({
    limit: String(DISCOVERY_FETCH_POOL_SIZE),
    sort: "created_at",
    order: "desc"
  });
  const filters: FreehireQueryFilters = {};
  const dropped: string[] = [];

  for (const key of Object.keys(FACET_SCHEMAS) as FacetKey[]) {
    const valid: string[] = [];
    for (const raw of prefs[key] ?? []) {
      const parsed = FACET_SCHEMAS[key].safeParse(raw);
      if (parsed.success) valid.push(parsed.data);
      else dropped.push(`${key}:${raw}`);
    }
    if (valid.length === 0) continue;
    params.set(FACET_KEY_TO_WIRE[key], valid.join(","));
    filters[key] = valid;
  }

  const roleKeywords = prefs.roleKeywords.map((k) => k.trim()).filter(Boolean);
  if (roleKeywords.length > 0) {
    params.set("q", roleKeywords.join(" "));
    filters.q = roleKeywords;
  }

  if (prefs.workModes.length > 0) {
    params.set("work_mode", prefs.workModes.join(","));
    filters.work_mode = prefs.workModes;
  }

  const salaryCurrency = prefs.salaryCurrency?.trim().toUpperCase() ?? "";
  const currencyValid = SalaryCurrencySchema.safeParse(salaryCurrency).success;
  if (salaryCurrency !== "" && !currencyValid) {
    dropped.push(`salaryCurrency:${salaryCurrency}`);
  }
  if (prefs.salaryMin != null && currencyValid) {
    const salaryMin = Math.trunc(prefs.salaryMin);
    params.set("salary_min", String(salaryMin));
    params.set("salary_currency", salaryCurrency);
    filters.salary_min = salaryMin;
    filters.salary_currency = salaryCurrency;
  }

  if (prefs.experienceYearsMin != null) {
    params.set("experience_years_min", String(prefs.experienceYearsMin));
    filters.experience_years_min = prefs.experienceYearsMin;
  }
  if (prefs.experienceYearsMax != null) {
    params.set("experience_years_max", String(prefs.experienceYearsMax));
    filters.experience_years_max = prefs.experienceYearsMax;
  }
  if (prefs.openWithinDays != null) {
    params.set("open_within_days", String(prefs.openWithinDays));
    filters.open_within_days = prefs.openWithinDays;
  }
  if (prefs.visaSponsorship != null) {
    params.set("visa_sponsorship", prefs.visaSponsorship ? "true" : "false");
    filters.visa_sponsorship = prefs.visaSponsorship;
  }
  if (prefs.requiresClearance != null) {
    params.set("requires_clearance", prefs.requiresClearance ? "true" : "false");
    filters.requires_clearance = prefs.requiresClearance;
  }

  return { params, filters, hash: await preferenceQueryHash(filters), dropped };
}
