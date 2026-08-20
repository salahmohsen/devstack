import {
  FREEHIRE_ATS_SOURCES,
  type AdapterFetchInput,
  type FreehireAtsSource,
  type JobSourceAdapter,
  type NormalizedListing
} from "@tsu-stack/core";

import { fetchNormalizedListings } from "#@/lib/job-discovery/fetch-json";
import {
  asEmploymentType,
  asFiniteNumber,
  asHiringRegion,
  asListingUrl,
  asNonEmptyString,
  asPostedAt,
  asRecord,
  asStringList,
  asWorkMode,
  rowsFrom,
  toNormalizedListing
} from "#@/lib/job-discovery/raw";

const SEARCH_URL = "https://freehire.me/api/v1/jobs/search";
const ATS_SOURCE_QUERY = FREEHIRE_ATS_SOURCES.join(",");
const ATS_SOURCE_SET = new Set<string>(FREEHIRE_ATS_SOURCES);

function isAtsSource(value: string): value is FreehireAtsSource {
  return ATS_SOURCE_SET.has(value);
}

export function normalizeFreehireJob(raw: unknown): NormalizedListing | null {
  const rec = asRecord(raw);
  if (!rec) return null;

  const source = asNonEmptyString(rec.source)?.toLowerCase();
  if (!source || !isAtsSource(source)) return null;

  const title = asNonEmptyString(rec.title);
  const companyName = asNonEmptyString(rec.company);
  const listingUrl = asListingUrl(rec.url);
  const externalId = asNonEmptyString(rec.public_slug);
  if (!title || !companyName || !listingUrl || !externalId) return null;

  const enrichment = asRecord(rec.enrichment);
  const address = asRecord(rec.address) ?? asRecord(enrichment?.address);
  const location = asNonEmptyString(rec.location) ?? asNonEmptyString(enrichment?.location);
  const workMode =
    asWorkMode(rec.work_mode) ??
    asWorkMode(rec.workplaceType) ??
    asWorkMode(rec.workplace_type) ??
    asWorkMode(enrichment?.work_mode) ??
    asWorkMode(enrichment?.workplaceType) ??
    asWorkMode(rec.isRemote) ??
    asWorkMode(rec.remote) ??
    asWorkMode(enrichment?.isRemote);
  const employmentType =
    asEmploymentType(rec.employmentType) ??
    asEmploymentType(rec.employment_type) ??
    asEmploymentType(enrichment?.employmentType) ??
    asEmploymentType(enrichment?.employment_type);

  return toNormalizedListing({
    adapterId: "freehire",
    externalId,
    listingUrl,
    title,
    companyName,
    location,
    workMode,
    hiringRegion: asHiringRegion(
      location,
      address?.addressCountry,
      rec.country,
      rec.addressCountry,
      enrichment?.country
    ),
    employmentType,
    salaryMin: asFiniteNumber(enrichment?.salary_min),
    salaryMax: asFiniteNumber(enrichment?.salary_max),
    salaryCurrency: asNonEmptyString(enrichment?.salary_currency),
    skills: asStringList(rec.skills),
    description: asNonEmptyString(rec.description ?? rec.preview),
    postedAt: asPostedAt(rec.posted_at),
    sourcePlatform: source,
    companySlug: asNonEmptyString(rec.company_slug),
    experienceYearsMin: asFiniteNumber(enrichment?.experience_years_min),
    seniority: asNonEmptyString(enrichment?.seniority)
  });
}

function searchUrl(input: AdapterFetchInput): string {
  const url = new URL(SEARCH_URL);
  const q = input.q?.trim();
  if (q) url.searchParams.set("q", q);
  url.searchParams.set("sort", "posted_at");
  url.searchParams.set("order", "desc");
  const limit = Math.min(50, Math.max(1, input.limit ?? 50));
  url.searchParams.set("limit", String(limit));
  const page = input.page ?? 1;
  url.searchParams.set("offset", String(Math.max(0, (page - 1) * limit)));
  url.searchParams.set("source", ATS_SOURCE_QUERY);
  // Ingest omits workMode when 0 or all 3 prefs are selected.
  if (input.workMode) url.searchParams.set("work_mode", input.workMode);
  return url.toString();
}

export const freehireAdapter: JobSourceAdapter = {
  id: "freehire",
  capabilities: ["search"],
  fetch(input) {
    return fetchNormalizedListings(
      searchUrl(input),
      (body) => rowsFrom(body, "data"),
      normalizeFreehireJob
    );
  }
};
