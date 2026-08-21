import { z } from "zod";

import {
  type AdapterFetchInput,
  type JobSourceAdapter,
  type NormalizedListing
} from "@tsu-stack/core";

import { fetchNormalizedListings } from "#@/lib/job-discovery/fetch-json";
import {
  asEmploymentType,
  asHiringRegion,
  asListingUrl,
  asNonEmptyString,
  asPostedAt,
  asStatedSalary,
  joinEntries,
  rowsFrom,
  toNormalizedListing
} from "#@/lib/job-discovery/raw";

const SEARCH_URL = "https://himalayas.app/jobs/api/search";

/** Live search returns country name strings; OpenAPI also documents `{ name, alpha2, slug }`. */
const HimalayasLocationRestrictionSchema = z.union([
  z.string(),
  z
    .object({
      name: z.string().optional(),
      alpha2: z.string().optional(),
      slug: z.string().optional()
    })
    .passthrough()
]);

/** Himalayas Remote Jobs API job object (search and browse share this shape). */
export const HimalayasJobSchema = z
  .object({
    title: z.string().min(1),
    excerpt: z.string().optional(),
    companyName: z.string().min(1),
    companySlug: z.string().optional(),
    companyLogo: z.string().optional(),
    companyLogoUrl: z.string().optional(),
    employmentType: z.string().nullable().optional(),
    minSalary: z.number().nullable().optional(),
    maxSalary: z.number().nullable().optional(),
    salaryPeriod: z.string().nullable().optional(),
    seniority: z.union([z.string(), z.array(z.string())]).optional(),
    currency: z.string().nullable().optional(),
    locationRestrictions: z.array(HimalayasLocationRestrictionSchema).optional(),
    timezoneRestrictions: z.array(z.union([z.number(), z.string()])).optional(),
    categories: z.array(z.string()).optional(),
    parentCategories: z.array(z.string()).optional(),
    description: z.string().nullable().optional(),
    pubDate: z.union([z.number(), z.string()]).optional(),
    createdAt: z.union([z.number(), z.string()]).optional(),
    expiryDate: z.union([z.number(), z.string()]).optional(),
    applicationLink: z.string().optional(),
    url: z.string().optional(),
    guid: z.union([z.string(), z.number()]).optional(),
    slug: z.string().optional()
  })
  .passthrough();

export type HimalayasJob = z.infer<typeof HimalayasJobSchema>;

function firstSeniority(value: HimalayasJob["seniority"]): string | null {
  if (Array.isArray(value)) return asNonEmptyString(value[0]);
  return asNonEmptyString(value);
}

function annualSalary(job: HimalayasJob): {
  salaryMin: number | null;
  salaryMax: number | null;
} {
  const period = job.salaryPeriod?.trim().toLowerCase() ?? "annual";
  if (period.length > 0 && period !== "annual" && period !== "yearly") {
    return { salaryMin: null, salaryMax: null };
  }
  return {
    salaryMin: asStatedSalary(job.minSalary),
    salaryMax: asStatedSalary(job.maxSalary)
  };
}

export function normalizeHimalayasJob(raw: unknown): NormalizedListing | null {
  const parsed = HimalayasJobSchema.safeParse(raw);
  if (!parsed.success) return null;
  const rec = parsed.data;

  const title = rec.title.trim();
  const companyName = rec.companyName.trim();
  const listingUrl = asListingUrl(rec.applicationLink ?? rec.url);
  const externalId = asNonEmptyString(rec.guid) ?? asNonEmptyString(rec.slug);
  if (!title || !companyName || !listingUrl || !externalId) return null;

  // Board is remote-only; empty locationRestrictions means worldwide.
  const location = joinEntries(rec.locationRestrictions);
  const salary = annualSalary(rec);
  return toNormalizedListing({
    adapterId: "himalayas",
    externalId,
    listingUrl,
    title,
    companyName,
    location,
    workMode: "remote",
    hiringRegion: location ? asHiringRegion(location) : "worldwide",
    employmentType: asEmploymentType(rec.employmentType),
    salaryMin: salary.salaryMin,
    salaryMax: salary.salaryMax,
    salaryCurrency: asNonEmptyString(rec.currency),
    skills: [],
    description: asNonEmptyString(rec.description),
    postedAt: asPostedAt(rec.pubDate ?? rec.createdAt),
    sourcePlatform: "himalayas",
    companySlug: asNonEmptyString(rec.companySlug),
    companyLogoUrl: asNonEmptyString(rec.companyLogo) ?? asNonEmptyString(rec.companyLogoUrl),
    seniority: firstSeniority(rec.seniority)
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
