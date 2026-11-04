import { z } from "zod";

import { ENV_SERVER } from "@tsu-stack/env/server/env";
import { createLogger } from "@tsu-stack/logger/server";

import { asFreehireError, FreehireError, freehireNetworkCode } from "./errors";
import { fetchFreehire } from "./transport";

const FREEHIRE_HEADERS = {
  Accept: "application/json",
  "User-Agent": "salahmohsen/dev-hub (+https://github.com/salahmohsen/dev-hub)"
};

const DEFAULT_FREEHIRE_BASE_URL = "https://freehire.me/api/v1";
const SEARCH_TIMEOUT_MS = 15_000;
const OPERATION = "api__freehire_agent_jobs_search";

const GEO_CITIES_TIMEOUT_MS = 5_000;
const GEO_CACHE_TTL_MS = 60 * 60 * 1000;
const GEO_CACHE_MAX_ENTRIES = 500;
const GEO_OPERATION = "api__freehire_geo_cities";

export const FreehireGeoCitySchema = z.object({
  value: z.string().min(1),
  country: z.string().min(1)
});
export type FreehireGeoCity = z.infer<typeof FreehireGeoCitySchema>;

const GeoCitiesEnvelopeSchema = z.object({
  data: z.array(FreehireGeoCitySchema)
});

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
    salary_period: z.string().nullish(),
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
    is_tech: z.string().nullish(),
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
    ignored_params: z.array(z.string()).nullish(),
    ignored_values: z.record(z.string(), z.array(z.string())).nullish()
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
    const res = await fetchFreehire(url, {
      signal: controller.signal,
      headers: FREEHIRE_HEADERS
    });
    const bodyText = await res.text();

    if (!res.ok) {
      const retryHeader = res.headers.get("retry-after");
      const retrySeconds = retryHeader == null ? NaN : Number(retryHeader);
      const retryAfterMs = Number.isFinite(retrySeconds)
        ? retrySeconds * 1000
        : retryHeader
          ? Date.parse(retryHeader) - Date.now()
          : 0;
      throw new FreehireError(
        `Job source returned HTTP ${res.status}.`,
        res.status === 429 || res.status === 408 || res.status >= 500,
        Math.max(0, Math.min(300_000, retryAfterMs || 0))
      );
    }

    let body: unknown;
    try {
      body = JSON.parse(bodyText);
    } catch (error) {
      throw new FreehireError("Job source returned an invalid response.", true, 0, {
        cause: error
      });
    }
    const parsed = FreehireSearchEnvelopeSchema.safeParse(body);
    if (!parsed.success) {
      throw new FreehireError("Job source response no longer matches its API contract.", false);
    }
    const envelope = parsed.data;
    const ignoredParams = envelope.meta.ignored_params ?? [];
    log.set({
      event: "freehire_agent_jobs_search_completed",
      status: res.status,
      total: envelope.meta.total ?? envelope.data.length,
      ratelimitLimit: res.headers.get("x-ratelimit-limit"),
      ratelimitRemaining: res.headers.get("x-ratelimit-remaining"),
      durationMs: Date.now() - started
    });
    if (ignoredParams.length > 0 || Object.keys(envelope.meta.ignored_values ?? {}).length > 0) {
      throw new FreehireError(
        "Job source did not accept the search filters. Review Job preferences.",
        false
      );
    }
    log.emit();
    return { jobs: envelope.data, total: envelope.meta.total ?? envelope.data.length };
  } catch (error) {
    log.error(error instanceof Error ? error : new Error(String(error)), {
      event: "freehire_agent_jobs_search_failed",
      durationMs: Date.now() - started,
      networkCode: freehireNetworkCode(error)
    });
    log.emit({ _forceKeep: true });
    throw asFreehireError(error);
  } finally {
    clearTimeout(timer);
    opts?.signal?.removeEventListener("abort", onCallerAbort);
  }
}

const geoCitiesCache = new Map<string, { at: number; options: FreehireGeoCity[] }>();

/** Test hook — the module-level cache is process-wide. */
export function clearGeoCitiesCache(): void {
  geoCitiesCache.clear();
}

/**
 * City suggestions from the freehire geo endpoint. Cached in-memory for 1h so
 * repeated browser keystrokes never hit freehire. Any failure resolves to an
 * empty list — autocomplete is never worth an error surface.
 */
export async function searchFreehireCities(query: string): Promise<FreehireGeoCity[]> {
  const q = query.trim().slice(0, 60);
  if (!q) return [];

  const cacheKey = q.toLowerCase();
  const cached = geoCitiesCache.get(cacheKey);
  if (cached && Date.now() - cached.at < GEO_CACHE_TTL_MS) {
    return cached.options;
  }

  const log = createLogger({ operation: GEO_OPERATION });
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEO_CITIES_TIMEOUT_MS);

  try {
    const res = await fetchFreehire(
      `${resolveFreehireBaseUrl()}/geo/cities?q=${encodeURIComponent(q)}`,
      {
        signal: controller.signal,
        headers: FREEHIRE_HEADERS
      }
    );
    const bodyText = await res.text();
    if (!res.ok) {
      throw new Error(`freehire geo cities failed: HTTP ${res.status}`);
    }
    const options = GeoCitiesEnvelopeSchema.parse(JSON.parse(bodyText)).data;

    const oldestKey = geoCitiesCache.keys().next().value;
    if (geoCitiesCache.size >= GEO_CACHE_MAX_ENTRIES && oldestKey !== undefined) {
      geoCitiesCache.delete(oldestKey);
    }
    geoCitiesCache.set(cacheKey, { at: Date.now(), options });

    log.set({
      event: "freehire_geo_cities_completed",
      status: res.status,
      count: options.length,
      durationMs: Date.now() - started
    });
    log.emit();
    return options;
  } catch (error) {
    log.error(error instanceof Error ? error : new Error(String(error)), {
      event: "freehire_geo_cities_failed",
      durationMs: Date.now() - started
    });
    log.emit({ _forceKeep: true });
    return [];
  } finally {
    clearTimeout(timer);
  }
}
