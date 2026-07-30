import { type OrpcContext } from "@tsu-stack/core";

import { createGitHubResponseMetadata } from "#@/infrastructure/octokit/client";
import {
  type GitHubConditionalRequestState,
  type GitHubGraphQLRateLimit
} from "#@/repo/shared.types";
import { type GitHubDataSource } from "#@/schemas";

type GitHubLocalFirstLogMeta = {
  cacheStatus: "fresh" | "stale" | "miss";
  fetchedAt: string | null;
  isRevalidating: boolean;
  source: GitHubDataSource;
};

export function createGraphQLResponseMetadata(
  rateLimit: Pick<GitHubGraphQLRateLimit, "remaining" | "resetAt"> | null | undefined
) {
  return createGitHubResponseMetadata(200, {
    "x-ratelimit-remaining":
      typeof rateLimit?.remaining === "number" ? String(rateLimit.remaining) : undefined,
    "x-ratelimit-reset": rateLimit?.resetAt
      ? String(Math.floor(new Date(rateLimit.resetAt).getTime() / 1_000))
      : undefined
  });
}

export function withLocalFirstMeta<T extends object>(
  data: T,
  meta: {
    cacheStatus: "fresh" | "stale" | "miss";
    fetchedAt: string | null;
    isRevalidating: boolean;
    source: GitHubDataSource;
  }
): T {
  return {
    ...data,
    __meta: {
      ...meta,
      fetchedAt: meta.fetchedAt ? Date.parse(meta.fetchedAt) : null
    }
  };
}

export function buildGitHubConditionalHeaders(conditionals: GitHubConditionalRequestState) {
  return {
    ...(conditionals.etag ? { "if-none-match": conditionals.etag } : {}),
    ...(conditionals.lastModified ? { "if-modified-since": conditionals.lastModified } : {})
  };
}

export function setRepoLoggerContext(
  context: OrpcContext | undefined,
  handler: string,
  details: Record<string, unknown>
) {
  // The `?.` on `logger` is deliberate: when the request path is
  // excluded from the Hono logger middleware (e.g. `/api/workflows/**`
  // — see `honoLoggerMiddleware({ exclude: [...] })` in
  // `apps/server/src/app.ts:74`) the Hono `c.get("log")` is undefined
  // and `createContext` builds an `OrpcContext` with no logger. The
  // repo utils used to throw "Cannot read properties of undefined
  // (reading 'set')" in that case. See plan #28.
  context?.logger?.set({
    handler,
    ...details
  });
}

export function setRepoLoggerOutcome(
  context: OrpcContext | undefined,
  event: string,
  details: Record<string, unknown> = {}
) {
  context?.logger?.set({
    event,
    ...details
  });
}

/** Short legend for log readers (mirrors GitHubDataSourceSchema). */
const SOURCE_BLURB: Record<GitHubDataSource, string> = {
  kv: "cache hit (kv)",
  db: "cache hit (db)",
  api: "live github fetch",
  revalidated: "github 304 — cache kept",
  "rate-limit": "stale cache after rate limit",
  "error-cache": "stale cache after fetch error"
};

export function setRepoLoggerLocalFirstOutcome(
  context: OrpcContext | undefined,
  event: string,
  meta: GitHubLocalFirstLogMeta,
  details: Record<string, unknown> = {}
) {
  setRepoLoggerOutcome(context, event, {
    // cacheStatus: fresh | stale | miss — age/signal of the entry
    cacheStatus: meta.cacheStatus,
    fetchedAt: meta.fetchedAt,
    isRevalidating: meta.isRevalidating,
    // source: where the payload was served from (see SOURCE_BLURB)
    source: meta.source,
    sourceNote: SOURCE_BLURB[meta.source],
    ...details
  });
}
