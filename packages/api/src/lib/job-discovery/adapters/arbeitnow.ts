import {
  type AdapterFetchInput,
  type JobSourceAdapter,
  type NormalizedListing
} from "@tsu-stack/core";

import { fetchNormalizedListings } from "#@/lib/job-discovery/fetch-json";
import {
  asListingUrl,
  asNonEmptyString,
  asPostedAt,
  asRecord,
  asStringList,
  rowsFrom,
  toNormalizedListing
} from "#@/lib/job-discovery/raw";

const FEED_URL = "https://www.arbeitnow.com/api/job-board-api";

export function normalizeArbeitnowJob(raw: unknown): NormalizedListing | null {
  const rec = asRecord(raw);
  if (!rec) return null;

  const title = asNonEmptyString(rec.title);
  const companyName = asNonEmptyString(rec.company_name);
  const listingUrl = asListingUrl(rec.url);
  const externalId = asNonEmptyString(rec.slug);
  if (!title || !companyName || !listingUrl || !externalId) return null;

  return toNormalizedListing({
    adapterId: "arbeitnow",
    externalId,
    listingUrl,
    title,
    companyName,
    location: asNonEmptyString(rec.location),
    workMode: rec.remote === true ? "remote" : null,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    skills: asStringList(rec.tags),
    description: asNonEmptyString(rec.description),
    postedAt: asPostedAt(rec.created_at),
    sourcePlatform: "arbeitnow",
    companyLogoUrl: asNonEmptyString(rec.company_logo) ?? asNonEmptyString(rec.logo)
  });
}

function feedUrl(input: AdapterFetchInput): string {
  const url = new URL(FEED_URL);
  url.searchParams.set("page", String(input.page ?? 1));
  return url.toString();
}

export const arbeitnowAdapter: JobSourceAdapter = {
  id: "arbeitnow",
  capabilities: ["feed"],
  fetch(input) {
    return fetchNormalizedListings(
      feedUrl(input),
      (body) => rowsFrom(body, "data"),
      normalizeArbeitnowJob
    );
  }
};
