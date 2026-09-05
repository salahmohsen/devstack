import sanitizeHtml from "sanitize-html";

import { WorkModeSchema } from "@tsu-stack/core";
import { type NewUserJob } from "@tsu-stack/db";

import { type FreehireAgentJob } from "./client";

/** Freehire descriptions are raw HTML — allowlist before storage/render. */
const DESCRIPTION_SANITIZE_OPTIONS = {
  allowedTags: ["p", "br", "ul", "ol", "li", "strong", "em", "b", "i", "h1", "h2", "h3", "h4", "a"],
  allowedAttributes: { a: ["href"] },
  allowedSchemes: ["http", "https"],
  allowProtocolRelative: false
};

function textOrNull(value: string | null | undefined): string | null {
  const text = value?.trim();
  return text != null && text.length > 0 ? text : null;
}

function intOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : null;
}

/**
 * Thin stubs ship `enrichment_version: 0` (salary/years/seniority/category/
 * summary absent). Treat ev-0 or missing enrichment as none.
 */
function enrichmentOf(job: FreehireAgentJob): FreehireAgentJob["enrichment"] {
  if (!job.enrichment) return null;
  if ((job.enrichment_version ?? 0) === 0) return null;
  return job.enrichment;
}

function asWorkMode(value: string | null | undefined): string | null {
  const parsed = WorkModeSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function postedAtOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toUserJobRow(
  job: FreehireAgentJob,
  meta: { userId: string; queryHash: string; queryFilters: Record<string, unknown> }
): NewUserJob {
  const enrichment = enrichmentOf(job);
  return {
    userId: meta.userId,
    freehireSlug: job.public_slug,
    title: job.title,
    // user_job.company_name is NOT NULL — the title fallback keeps the row renderable.
    companyName: textOrNull(job.company) ?? job.title,
    companySlug: textOrNull(job.company_slug),
    companyLogoUrl: null,
    listingUrl: job.url,
    location: textOrNull(job.location),
    workMode: asWorkMode(job.work_mode),
    employmentType: textOrNull(enrichment?.employment_type),
    seniority: textOrNull(enrichment?.seniority),
    experienceYearsMin: intOrNull(enrichment?.experience_years_min),
    salaryMin: intOrNull(enrichment?.salary_min),
    salaryMax: intOrNull(enrichment?.salary_max),
    salaryCurrency: textOrNull(enrichment?.salary_currency),
    skills: (job.skills ?? []).filter((skill) => skill.trim().length > 0),
    category: textOrNull(enrichment?.category),
    domains: enrichment?.domains ?? [],
    summary: textOrNull(enrichment?.summary),
    description: job.description
      ? sanitizeHtml(job.description, DESCRIPTION_SANITIZE_OPTIONS)
      : null,
    postedAt: postedAtOrNull(job.posted_at),
    reality: textOrNull(job.reality?.class),
    source: textOrNull(job.source),
    queryHash: meta.queryHash,
    queryFilters: meta.queryFilters
  };
}
