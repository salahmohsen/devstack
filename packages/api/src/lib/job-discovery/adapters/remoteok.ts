import { z } from "zod";

import { type JobSourceAdapter, type NormalizedListing } from "@tsu-stack/core";

import { fetchNormalizedListings } from "#@/lib/job-discovery/fetch-json";
import {
  asHiringRegion,
  asListingUrl,
  asNonEmptyString,
  asPostedAt,
  asStatedSalary,
  asStringList,
  rowsFrom,
  statedWorkMode,
  toNormalizedListing
} from "#@/lib/job-discovery/raw";

const FEED_URL = "https://remoteok.com/api";

/** RemoteOK `/api` job object. Index 0 of the array is a legal notice, not a job. */
export const RemoteokJobSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    position: z.string().min(1),
    company: z.string().min(1),
    url: z.string().min(1),
    slug: z.string().optional(),
    location: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
    description: z.string().nullable().optional(),
    date: z.union([z.string(), z.number()]).optional(),
    epoch: z.number().optional(),
    salary_min: z.number().nullable().optional(),
    salary_max: z.number().nullable().optional(),
    salary_currency: z.string().nullable().optional(),
    logo: z.string().optional(),
    company_logo: z.string().optional(),
    apply_url: z.string().optional()
  })
  .passthrough();

export type RemoteokJob = z.infer<typeof RemoteokJobSchema>;

export function normalizeRemoteokJob(raw: unknown): NormalizedListing | null {
  const parsed = RemoteokJobSchema.safeParse(raw);
  if (!parsed.success) return null;
  const rec = parsed.data;

  const title = rec.position.trim();
  const companyName = rec.company.trim();
  const listingUrl = asListingUrl(rec.url);
  const externalId = asNonEmptyString(rec.id);
  if (!title || !companyName || !listingUrl || !externalId) return null;

  const location = asNonEmptyString(rec.location);
  return toNormalizedListing({
    adapterId: "remoteok",
    externalId,
    listingUrl,
    title,
    companyName,
    location,
    workMode: statedWorkMode([], location) ?? "remote",
    hiringRegion: location ? asHiringRegion(location) : "worldwide",
    salaryMin: asStatedSalary(rec.salary_min),
    salaryMax: asStatedSalary(rec.salary_max),
    salaryCurrency: asNonEmptyString(rec.salary_currency),
    skills: asStringList(rec.tags),
    description: asNonEmptyString(rec.description),
    postedAt: asPostedAt(rec.date ?? rec.epoch),
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
