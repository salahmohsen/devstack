import { type JobSourceAdapter, type NormalizedListing } from "@tsu-stack/core";

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

const FEED_URL = "https://remoteok.com/api";

export function normalizeRemoteokJob(raw: unknown): NormalizedListing | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  if (rec.id == null || rec.position == null) return null;

  const title = asNonEmptyString(rec.position);
  const companyName = asNonEmptyString(rec.company);
  const listingUrl = asListingUrl(rec.url);
  const externalId = asNonEmptyString(rec.id);
  if (!title || !companyName || !listingUrl || !externalId) return null;

  return toNormalizedListing({
    adapterId: "remoteok",
    externalId,
    listingUrl,
    title,
    companyName,
    location: asNonEmptyString(rec.location),
    workMode: "remote",
    salaryMin: asFiniteNumber(rec.salary_min),
    salaryMax: asFiniteNumber(rec.salary_max),
    salaryCurrency: asNonEmptyString(rec.salary_currency),
    skills: asStringList(rec.tags),
    description: asNonEmptyString(rec.description),
    postedAt: asPostedAt(rec.date),
    sourcePlatform: "remoteok",
    companyLogoUrl: asNonEmptyString(rec.logo) ?? asNonEmptyString(rec.company_logo)
  });
}

export const remoteokAdapter: JobSourceAdapter = {
  id: "remoteok",
  capabilities: ["feed"],
  fetch() {
    return fetchNormalizedListings(
      FEED_URL,
      (body) => rowsFrom(body, "jobs"),
      normalizeRemoteokJob
    );
  }
};
