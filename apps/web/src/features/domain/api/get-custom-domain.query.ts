import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

export const domainQueryKeys = {
  current() {
    return orpcQueryClient.domain.get.key();
  }
};

function isAbortError(error: unknown): boolean {
  if (error instanceof Error && error.name === "AbortError") return true;
  if (typeof DOMException !== "undefined" && error instanceof DOMException) {
    return error.name === "AbortError";
  }
  return false;
}

function isUnauthorizedError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { message?: unknown; code?: unknown; status?: unknown; data?: unknown };
  if (e.status === 401 || e.code === "UNAUTHORIZED") return true;
  if (typeof e.message === "string" && /unauthorized/i.test(e.message)) return true;
  return false;
}

/**
 * Domain settings query. Refetch on mount so a failed SSR prefetch / brief
 * session race does not leave the page stuck on a permanent error card.
 */
export function getCustomDomainQueryOptions() {
  return orpcQueryClient.domain.get.queryOptions({
    staleTime: 30_000,
    refetchOnMount: "always",
    // Settings forms keep local drafts; tab focus must not clobber hostname input.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: (failureCount, error) => {
      if (isAbortError(error)) return false;
      // Brief session/cookie races after navigation — retry a couple times.
      if (isUnauthorizedError(error)) return failureCount < 2;
      return failureCount < 2;
    },
    retryDelay: (attempt) => Math.min(400 * 2 ** attempt, 2_000)
  });
}

export function useGetCustomDomainQuery() {
  return useQuery(getCustomDomainQueryOptions());
}

export type CustomDomainQueryResult = Awaited<ReturnType<typeof orpcClient.domain.get>>;
