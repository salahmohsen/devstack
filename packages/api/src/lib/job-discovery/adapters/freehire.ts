import { z } from "zod";

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
  asStatedSalary,
  asStringList,
  rowsFrom,
  statedWorkMode,
  toNormalizedListing
} from "#@/lib/job-discovery/raw";

const SEARCH_URL = "https://freehire.me/api/v1/jobs/search";
const ATS_SOURCE_QUERY = FREEHIRE_ATS_SOURCES.join(",");
const ATS_SOURCE_SET = new Set<string>(FREEHIRE_ATS_SOURCES);

/** ISO-2 from `countries[]` → closed hiring-region slugs. */
const FREEHIRE_COUNTRY_SLUG: Record<string, string> = {
  us: "us",
  gb: "uk",
  uk: "uk",
  de: "de",
  br: "br",
  ca: "canada",
  in: "india",
  ie: "ireland",
  pl: "poland",
  eg: "egypt",
  au: "apac",
  sg: "apac",
  my: "apac",
  tw: "apac",
  hk: "apac",
  ae: "mena",
  sa: "saudi_arabia",
  ar: "latam",
  mx: "latam",
  co: "latam",
  pe: "latam",
  uy: "latam",
  it: "eu",
  fr: "eu",
  es: "eu",
  nl: "eu",
  pt: "eu",
  at: "eu",
  be: "eu"
};

function isAtsSource(value: string): value is FreehireAtsSource {
  return ATS_SOURCE_SET.has(value);
}

const FreehireEnrichmentSchema = z
  .object({
    employment_type: z.unknown().optional(),
    employmentType: z.unknown().optional(),
    experience_years_min: z.number().nullable().optional(),
    salary_min: z.number().nullable().optional(),
    salary_max: z.number().nullable().optional(),
    salary_currency: z.string().nullable().optional(),
    seniority: z.string().nullable().optional(),
    work_mode: z.unknown().optional(),
    workplaceType: z.unknown().optional(),
    isRemote: z.unknown().optional(),
    location: z.string().nullable().optional(),
    country: z.unknown().optional(),
    address: z.unknown().optional()
  })
  .passthrough();

/** Freehire search row. `work_mode` is often omitted; location/ATS fields still state it. */
export const FreehireJobSchema = z
  .object({
    public_slug: z.string().min(1),
    source: z.string().min(1),
    url: z.string().min(1),
    title: z.string().min(1),
    company: z.string().min(1),
    company_slug: z.string().optional(),
    location: z.string().nullable().optional(),
    work_mode: z.string().nullable().optional(),
    workplaceType: z.unknown().optional(),
    workplace_type: z.unknown().optional(),
    isRemote: z.unknown().optional(),
    remote: z.unknown().optional(),
    countries: z.array(z.string()).optional(),
    regions: z.array(z.string()).optional(),
    cities: z.array(z.string()).optional(),
    skills: z.array(z.string()).optional(),
    description: z.string().nullable().optional(),
    preview: z.string().nullable().optional(),
    posted_at: z.string().optional(),
    enrichment: FreehireEnrichmentSchema.nullable().optional(),
    employmentType: z.unknown().optional(),
    employment_type: z.unknown().optional(),
    address: z.unknown().optional(),
    country: z.unknown().optional(),
    addressCountry: z.unknown().optional()
  })
  .passthrough();

export type FreehireJob = z.infer<typeof FreehireJobSchema>;

function countrySlug(code: string): string {
  const key = code.trim().toLowerCase();
  return FREEHIRE_COUNTRY_SLUG[key] ?? key;
}

export function normalizeFreehireJob(raw: unknown): NormalizedListing | null {
  const parsed = FreehireJobSchema.safeParse(raw);
  if (!parsed.success) return null;
  const rec = parsed.data;

  const source = rec.source.trim().toLowerCase();
  if (!isAtsSource(source)) return null;

  const title = rec.title.trim();
  const companyName = rec.company.trim();
  const listingUrl = asListingUrl(rec.url);
  const externalId = rec.public_slug.trim();
  if (!title || !companyName || !listingUrl || !externalId) return null;

  const enrichment = rec.enrichment ?? null;
  const address = asRecord(rec.address) ?? asRecord(enrichment?.address);
  const location = asNonEmptyString(rec.location) ?? asNonEmptyString(enrichment?.location ?? null);
  const workMode = statedWorkMode(
    [
      rec.work_mode,
      rec.workplaceType,
      rec.workplace_type,
      enrichment?.work_mode,
      enrichment?.workplaceType,
      rec.isRemote,
      rec.remote,
      enrichment?.isRemote
    ],
    location
  );
  const employmentType =
    asEmploymentType(rec.employmentType) ??
    asEmploymentType(rec.employment_type) ??
    asEmploymentType(enrichment?.employmentType) ??
    asEmploymentType(enrichment?.employment_type);

  const countryHints = (rec.countries ?? []).map(countrySlug);
  const hiringRegion = asHiringRegion(
    ...countryHints,
    ...(rec.regions ?? []),
    location,
    address?.addressCountry,
    rec.country,
    rec.addressCountry,
    enrichment?.country
  );

  return toNormalizedListing({
    adapterId: "freehire",
    externalId,
    listingUrl,
    title,
    companyName,
    location,
    workMode,
    hiringRegion,
    employmentType,
    salaryMin: asStatedSalary(enrichment?.salary_min),
    salaryMax: asStatedSalary(enrichment?.salary_max),
    salaryCurrency: asNonEmptyString(enrichment?.salary_currency ?? null),
    skills: asStringList(rec.skills),
    description: asNonEmptyString(rec.description ?? rec.preview),
    postedAt: asPostedAt(rec.posted_at),
    sourcePlatform: source,
    companySlug: asNonEmptyString(rec.company_slug),
    experienceYearsMin: asFiniteNumber(enrichment?.experience_years_min),
    seniority: asNonEmptyString(enrichment?.seniority ?? null)
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
