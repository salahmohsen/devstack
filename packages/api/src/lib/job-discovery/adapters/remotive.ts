import {
  type AdapterFetchInput,
  type JobSourceAdapter,
  type NormalizedListing
} from "@tsu-stack/core";

import { fetchNormalizedListings } from "#@/lib/job-discovery/fetch-json";
import {
  asFiniteNumber,
  asListingUrl,
  asNonEmptyString,
  asPostedAt,
  asRecord,
  asStringList,
  rowsFrom,
  toNormalizedListing
} from "#@/lib/job-discovery/raw";

const SEARCH_URL = "https://remotive.com/api/remote-jobs";

function structuredSalary(raw: Record<string, unknown>): {
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
} {
  const salary = raw.salary;
  const rec = asRecord(salary);
  if (!rec) {
    return { salaryMin: null, salaryMax: null, salaryCurrency: null };
  }
  return {
    salaryMin: asFiniteNumber(rec.min ?? rec.salary_min ?? rec.minSalary),
    salaryMax: asFiniteNumber(rec.max ?? rec.salary_max ?? rec.maxSalary),
    salaryCurrency: asNonEmptyString(rec.currency ?? rec.salary_currency)
  };
}

export function normalizeRemotiveJob(raw: unknown): NormalizedListing | null {
  const rec = asRecord(raw);
  if (!rec) return null;

  const title = asNonEmptyString(rec.title);
  const companyName = asNonEmptyString(rec.company_name);
  const listingUrl = asListingUrl(rec.url);
  const externalId = asNonEmptyString(rec.id);
  if (!title || !companyName || !listingUrl || !externalId) return null;

  const salary = structuredSalary(rec);
  return toNormalizedListing({
    adapterId: "remotive",
    externalId,
    listingUrl,
    title,
    companyName,
    location: asNonEmptyString(rec.candidate_required_location),
    workMode: "remote",
    salaryMin: salary.salaryMin,
    salaryMax: salary.salaryMax,
    salaryCurrency: salary.salaryCurrency,
    skills: asStringList(rec.tags),
    description: asNonEmptyString(rec.description),
    postedAt: asPostedAt(rec.publication_date),
    sourcePlatform: "remotive",
    companyLogoUrl: asNonEmptyString(rec.company_logo)
  });
}

function searchUrl(input: AdapterFetchInput): string {
  const url = new URL(SEARCH_URL);
  const q = input.q?.trim();
  if (q) url.searchParams.set("search", q);
  url.searchParams.set("category", "software-dev");
  if (input.limit != null) url.searchParams.set("limit", String(input.limit));
  return url.toString();
}

export const remotiveAdapter: JobSourceAdapter = {
  id: "remotive",
  capabilities: ["search"],
  fetch(input) {
    return fetchNormalizedListings(
      searchUrl(input),
      (body) => rowsFrom(body, "jobs"),
      normalizeRemotiveJob
    );
  }
};
