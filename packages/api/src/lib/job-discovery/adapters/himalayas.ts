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
  joinEntries,
  rowsFrom,
  toNormalizedListing
} from "#@/lib/job-discovery/raw";

const SEARCH_URL = "https://himalayas.app/jobs/api/search";

function explicitRemoteFlag(raw: Record<string, unknown>): "remote" | null {
  if (raw.remote === true || raw.isRemote === true) return "remote";
  return null;
}

export function normalizeHimalayasJob(raw: unknown): NormalizedListing | null {
  const rec = asRecord(raw);
  if (!rec) return null;

  const title = asNonEmptyString(rec.title);
  const companyName = asNonEmptyString(rec.companyName);
  const listingUrl = asListingUrl(rec.applicationLink ?? rec.url);
  const externalId = asNonEmptyString(rec.guid) ?? asNonEmptyString(rec.slug);
  if (!title || !companyName || !listingUrl || !externalId) return null;

  return toNormalizedListing({
    adapterId: "himalayas",
    externalId,
    listingUrl,
    title,
    companyName,
    location: joinEntries(rec.locationRestrictions),
    workMode: explicitRemoteFlag(rec),
    salaryMin: asFiniteNumber(rec.minSalary),
    salaryMax: asFiniteNumber(rec.maxSalary),
    salaryCurrency: asNonEmptyString(rec.currency),
    skills: [],
    description: asNonEmptyString(rec.description),
    postedAt: asPostedAt(rec.createdAt ?? rec.pubDate),
    sourcePlatform: "himalayas",
    companySlug: asNonEmptyString(rec.companySlug),
    companyLogoUrl: asNonEmptyString(rec.companyLogo) ?? asNonEmptyString(rec.companyLogoUrl)
  });
}

function searchUrl(input: AdapterFetchInput): string {
  const url = new URL(SEARCH_URL);
  const q = input.q?.trim();
  if (q) url.searchParams.set("q", q);
  url.searchParams.set("sort", "recent");
  url.searchParams.set("page", String(input.page ?? 1));
  return url.toString();
}

function himalayasRows(body: unknown): unknown[] {
  const jobs = rowsFrom(body, "jobs");
  return jobs.length > 0 ? jobs : rowsFrom(body, "data");
}

export const himalayasAdapter: JobSourceAdapter = {
  id: "himalayas",
  capabilities: ["search"],
  fetch(input) {
    return fetchNormalizedListings(searchUrl(input), himalayasRows, normalizeHimalayasJob);
  }
};
