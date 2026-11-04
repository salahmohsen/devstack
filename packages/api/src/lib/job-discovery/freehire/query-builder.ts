import { type z } from "zod";

import {
  DISCOVERY_FETCH_POOL_SIZE,
  FACET_KEY_TO_WIRE,
  FACETS,
  OpenFacetValueSchema,
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

  // The preference is a monthly floor, with unknown/different-currency pay
  // retained. Freehire salary filters exclude those rows and compare raw periods.
  // Keep the filter local and include it in the hash for snapshot invalidation.
  if (prefs.salaryMin != null && prefs.salaryCurrency?.trim()) {
    filters.local_monthly_salary_min = prefs.salaryMin;
    filters.local_salary_currency = prefs.salaryCurrency.trim().toUpperCase();
  }

  const modes = prefs.workModes;
  const hasPhysical = modes.length === 0 || modes.some((mode) => mode !== "remote");
  const hasRemote = modes.length === 0 || modes.includes("remote");
  const remoteRegions = params.get("regions");
  if (
    hasRemote &&
    hasPhysical &&
    ((prefs.cities?.length ?? 0) > 0 || (prefs.countries?.length ?? 0) > 0)
  ) {
    if (modes.length === 0) {
      params.set("work_mode", "remote,hybrid,onsite");
      filters.work_mode = ["remote", "hybrid", "onsite"];
    }
    params.set("work_mode_remote_anywhere", "true");
    if (remoteRegions) params.set("work_mode_remote_regions", remoteRegions);
    params.delete("regions");
    filters.work_mode_remote_anywhere = true;
    filters.work_mode_remote_regions = remoteRegions;
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

  if (prefs.experienceYearsMin != null || prefs.experienceYearsMax != null) {
    params.set("experience_include_unspecified", "true");
    filters.experience_include_unspecified = true;
  }
  params.set("description_format", "html");
  return { params, filters, hash: await preferenceQueryHash(filters), dropped };
}
