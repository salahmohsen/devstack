import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { parseUsername } from "@tsu-stack/core";

const PORTFOLIO_STALE_TIME = 1000 * 60 * 60;
const PORTFOLIO_GC_TIME = 1000 * 60 * 60 * 2;

/** Base key — invalidates every public portfolio list regardless of username. */
export function getPortfolioListQueryKey() {
  return orpcQueryClient.portfolio.list.key();
}

function isUsableUsername(username: string | undefined | null): username is string {
  if (!username?.trim()) return false;
  return parseUsername(username).success;
}

/** Public portfolio by path slug (or verified custom domain + slug). */
export function getPortfolioListQueryOptions(username: string) {
  return orpcQueryClient.portfolio.list.queryOptions({
    input: { username },
    staleTime: PORTFOLIO_STALE_TIME,
    gcTime: PORTFOLIO_GC_TIME
  });
}

/**
 * Dashboard chrome: omit username so the API resolves the signed-in user
 * via session (avoids 404 when the client slug is missing/stale).
 */
export function getOwnPortfolioListQueryOptions() {
  return orpcQueryClient.portfolio.list.queryOptions({
    input: {},
    staleTime: PORTFOLIO_STALE_TIME,
    gcTime: PORTFOLIO_GC_TIME
  });
}

export function useGetPortfolioListQuery(username: string, options?: { enabled?: boolean }) {
  return useQuery({
    ...getPortfolioListQueryOptions(username),
    // Skip reserved / invalid slugs so dashboard chrome does not spam NOT_FOUND.
    enabled: (options?.enabled ?? true) && isUsableUsername(username)
  });
}

/** Session-scoped portfolio list for authenticated dashboard layout. */
export function useGetOwnPortfolioListQuery(options?: { enabled?: boolean }) {
  return useQuery({
    ...getOwnPortfolioListQueryOptions(),
    enabled: options?.enabled ?? true
  });
}

export type PortfolioListQueryResult = Awaited<ReturnType<typeof orpcClient.portfolio.list>>;
