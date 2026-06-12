import { type OrpcContext } from "@tsu-stack/api/lib/context/types";

import { createGitHubResponseMetadata } from "#@/infrastructure/octokit/client";
import {
  type GitHubConditionalRequestState,
  type GitHubGraphQLRateLimit
} from "#@/repo/shared.types";

type GitHubLocalFirstLogMeta = {
  cacheStatus: "fresh" | "stale" | "miss";
  fetchedAt: string | null;
  isRevalidating: boolean;
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
  context?.logger.set({
    handler,
    ...details
  });
}

export function setRepoLoggerOutcome(
  context: OrpcContext | undefined,
  event: string,
  details: Record<string, unknown> = {}
) {
  context?.logger.set({
    event,
    ...details
  });
}

export function setRepoLoggerLocalFirstOutcome(
  context: OrpcContext | undefined,
  event: string,
  meta: GitHubLocalFirstLogMeta,
  details: Record<string, unknown> = {}
) {
  setRepoLoggerOutcome(context, event, {
    cacheStatus: meta.cacheStatus,
    fetchedAt: meta.fetchedAt,
    isRevalidating: meta.isRevalidating,
    ...details
  });
}
