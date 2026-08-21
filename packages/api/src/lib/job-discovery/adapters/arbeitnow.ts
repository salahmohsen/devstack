import { z } from "zod";

import {
  type AdapterFetchInput,
  type JobSourceAdapter,
  type NormalizedListing,
  type WorkMode
} from "@tsu-stack/core";

import { fetchNormalizedListings } from "#@/lib/job-discovery/fetch-json";
import {
  asEmploymentType,
  asHiringRegion,
  asListingUrl,
  asNonEmptyString,
  asPostedAt,
  asStringList,
  statedWorkMode,
  rowsFrom,
  toNormalizedListing
} from "#@/lib/job-discovery/raw";

const FEED_URL = "https://www.arbeitnow.com/api/job-board-api";

/** Arbeitnow job-board-api row. `remote` is always a boolean on the live feed. */
export const ArbeitnowJobSchema = z
  .object({
    slug: z.string().min(1),
    url: z.string().min(1),
    title: z.string().min(1),
    company_name: z.string().min(1),
    location: z.string().nullable().optional(),
    remote: z.boolean(),
    tags: z.array(z.string()).optional(),
    job_types: z.array(z.string()).optional(),
    description: z.string().nullable().optional(),
    created_at: z.union([z.number(), z.string()]).optional(),
    company_logo: z.string().optional(),
    logo: z.string().optional()
  })
  .passthrough();

export type ArbeitnowJob = z.infer<typeof ArbeitnowJobSchema>;

/** Location "Remote"/"Hybrid" beats a false flag; `remote: false` is stated not-remote. */
function arbeitnowWorkMode(rec: ArbeitnowJob, location: string | null): WorkMode {
  return statedWorkMode([], location) ?? (rec.remote ? "remote" : "onsite");
}

export function normalizeArbeitnowJob(raw: unknown): NormalizedListing | null {
  const parsed = ArbeitnowJobSchema.safeParse(raw);
  if (!parsed.success) return null;
  const rec = parsed.data;

  const title = rec.title.trim();
  const companyName = rec.company_name.trim();
  const listingUrl = asListingUrl(rec.url);
  const externalId = rec.slug.trim();
  if (!title || !companyName || !listingUrl || !externalId) return null;

  const location = asNonEmptyString(rec.location);
  return toNormalizedListing({
    adapterId: "arbeitnow",
    externalId,
    listingUrl,
    title,
    companyName,
    location,
    workMode: arbeitnowWorkMode(rec, location),
    hiringRegion: asHiringRegion(location),
    employmentType: asEmploymentType(rec.job_types),
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
