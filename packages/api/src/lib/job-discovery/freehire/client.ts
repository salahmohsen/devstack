import { z } from "zod";

import { ENV_SERVER } from "@tsu-stack/env/server/env";
import { createLogger } from "@tsu-stack/logger/server";

const DEFAULT_FREEHIRE_BASE_URL = "https://freehire.me/api/v1";
const SEARCH_TIMEOUT_MS = 15_000;
const OPERATION = "api__freehire_agent_jobs_search";

export function resolveFreehireBaseUrl(): string {
  return ENV_SERVER.FREEHIRE_API_BASE_URL?.trim() ?? DEFAULT_FREEHIRE_BASE_URL;
}

export const FreehireEnrichmentSchema = z
  .object({
    summary: z.string().nullish(),
    employment_type: z.string().nullish(),
    seniority: z.string().nullish(),
    salary_min: z.number().nullish(),
    salary_max: z.number().nullish(),
    salary_currency: z.string().nullish(),
    category: z.string().nullish(),
    experience_years_min: z.number().nullish(),
    domains: z.array(z.string()).nullish()
  })
  .passthrough();

export const FreehireRealitySchema = z
  .object({
    class: z.string().nullish(),
    age_days: z.number().nullish(),
    repost_count: z.number().nullish(),
    mass_posting_count: z.number().nullish(),
    fake_freshness: z.boolean().nullish()
  })
  .passthrough();

/** Lenient on unknown fields; strict only on fields the mapper consumes. */
export const FreehireAgentJobSchema = z
  .object({
    public_slug: z.string().min(1),
    source: z.string().nullish(),
    external_id: z.string().nullish(),
    url: z.string().min(1),
    title: z.string().min(1),
    company: z.string().nullish(),
    company_slug: z.string().nullish(),
    location: z.string().nullish(),
    description: z.string().nullish(),
    countries: z.array(z.string()).nullish(),
    regions: z.array(z.string()).nullish(),
    work_mode: z.string().nullish(),
    skills: z.array(z.string()).nullish(),
    cities: z.array(z.string()).nullish(),
    collections: z.array(z.string()).nullish(),
    posted_at: z.string().nullish(),
    created_at: z.string().nullish(),
    last_seen_at: z.string().nullish(),
    closed_at: z.string().nullish(),
    enrichment: FreehireEnrichmentSchema.nullish(),
    enrichment_version: z.number().nullish(),
    reality: FreehireRealitySchema.nullish()
  })
  .passthrough();
export type FreehireAgentJob = z.infer<typeof FreehireAgentJobSchema>;

const FreehireSearchEnvelopeSchema = z.object({
  data: z.array(FreehireAgentJobSchema),
  meta: z.object({
    total: z.number().nullish(),
    limit: z.number().nullish(),
    offset: z.number().nullish(),
    ignored_params: z.array(z.string()).nullish()
  })
});

export type FreehireSearchResult = { jobs: FreehireAgentJob[]; total: number };

export async function searchFreehireJobs(
  params: URLSearchParams,
  opts?: { signal?: AbortSignal }
): Promise<FreehireSearchResult> {
  const log = createLogger({ operation: OPERATION });
  const started = Date.now();
  const url = `${resolveFreehireBaseUrl()}/agent/jobs/search?${params.toString()}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  const onCallerAbort = () => controller.abort();
  opts?.signal?.addEventListener("abort", onCallerAbort, { once: true });
  if (opts?.signal?.aborted) controller.abort();

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" }
    });
    const bodyText = await res.text();

    if (!res.ok) {
      let detail = "";
      try {
        const rawError = (JSON.parse(bodyText) as { error?: unknown }).error;
        detail = typeof rawError === "string" ? rawError : JSON.stringify(rawError);
      } catch {
        detail = bodyText.slice(0, 200);
      }
      throw new Error(
        `freehire agent jobs search failed: HTTP ${res.status}${detail ? ` ${detail}` : ""}`
      );
    }

    let body: unknown;
    try {
      body = JSON.parse(bodyText);
    } catch (error) {
      throw new Error(`freehire agent jobs search: bad envelope (HTTP ${res.status})`, {
        cause: error
      });
    }
    const envelope = FreehireSearchEnvelopeSchema.parse(body);
    const ignoredParams = envelope.meta.ignored_params ?? [];
    log.set({
      event: "freehire_agent_jobs_search_completed",
      status: res.status,
      total: envelope.meta.total ?? envelope.data.length,
      ratelimitLimit: res.headers.get("x-ratelimit-limit"),
      ratelimitRemaining: res.headers.get("x-ratelimit-remaining"),
      durationMs: Date.now() - started
    });
    if (ignoredParams.length > 0) log.warn("ignored_params_present", { ignoredParams });
    log.emit();
    return { jobs: envelope.data, total: envelope.meta.total ?? envelope.data.length };
  } catch (error) {
    log.error(error instanceof Error ? error : new Error(String(error)), {
      event: "freehire_agent_jobs_search_failed",
      durationMs: Date.now() - started
    });
    log.emit({ _forceKeep: true });
    throw error;
  } finally {
    clearTimeout(timer);
    opts?.signal?.removeEventListener("abort", onCallerAbort);
  }
}
