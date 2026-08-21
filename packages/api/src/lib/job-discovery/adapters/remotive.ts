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
  asRecord,
  asStatedSalary,
  asStringList,
  rowsFrom,
  toNormalizedListing
} from "#@/lib/job-discovery/raw";

const SEARCH_URL = "https://remotive.com/api/remote-jobs";

/** Remotive job. Live `salary` is a display string; some payloads nest min/max. */
export const RemotiveJobSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    url: z.string().min(1),
    title: z.string().min(1),
    company_name: z.string().min(1),
    candidate_required_location: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
    job_type: z.string().nullable().optional(),
    salary: z
      .union([z.string(), z.record(z.string(), z.unknown())])
      .nullable()
      .optional(),
    description: z.string().nullable().optional(),
    publication_date: z.string().optional(),
    category: z.string().optional(),
    company_logo: z.string().optional(),
    company_logo_url: z.string().optional()
  })
  .passthrough();

export type RemotiveJob = z.infer<typeof RemotiveJobSchema>;

function structuredSalary(salary: RemotiveJob["salary"]): {
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
} {
  const rec = asRecord(salary);
  if (!rec) {
    return { salaryMin: null, salaryMax: null, salaryCurrency: null };
  }
  return {
    salaryMin: asStatedSalary(rec.min ?? rec.salary_min ?? rec.minSalary),
    salaryMax: asStatedSalary(rec.max ?? rec.salary_max ?? rec.maxSalary),
    salaryCurrency: asNonEmptyString(rec.currency ?? rec.salary_currency)
  };
}

export function normalizeRemotiveJob(raw: unknown): NormalizedListing | null {
  const parsed = RemotiveJobSchema.safeParse(raw);
  if (!parsed.success) return null;
  const rec = parsed.data;

  const title = rec.title.trim();
  const companyName = rec.company_name.trim();
  const listingUrl = asListingUrl(rec.url);
  const externalId = asNonEmptyString(rec.id);
  if (!title || !companyName || !listingUrl || !externalId) return null;

  const location = asNonEmptyString(rec.candidate_required_location);
  const salary = structuredSalary(rec.salary);
  return toNormalizedListing({
    adapterId: "remotive",
    externalId,
    listingUrl,
    title,
    companyName,
    location,
    workMode: "remote",
    hiringRegion: location ? asHiringRegion(location) : "worldwide",
    employmentType: asEmploymentType(rec.job_type),
    salaryMin: salary.salaryMin,
    salaryMax: salary.salaryMax,
    salaryCurrency: salary.salaryCurrency,
    skills: asStringList(rec.tags),
    description: asNonEmptyString(rec.description),
    postedAt: asPostedAt(rec.publication_date),
    sourcePlatform: "remotive",
    companyLogoUrl: asNonEmptyString(rec.company_logo) ?? asNonEmptyString(rec.company_logo_url)
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
