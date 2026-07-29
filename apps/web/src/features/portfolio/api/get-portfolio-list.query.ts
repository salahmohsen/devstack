import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { parseProfileName } from "@tsu-stack/core";

const PORTFOLIO_STALE_TIME = 1000 * 60 * 60;
const PORTFOLIO_GC_TIME = 1000 * 60 * 60 * 2;

/** Base key — invalidates every public portfolio list regardless of profileName. */
export function getPortfolioListQueryKey() {
  return orpcQueryClient.portfolio.list.key();
}

function isUsableProfileName(profileName: string | undefined | null): profileName is string {
  if (!profileName?.trim()) return false;
  return parseProfileName(profileName).success;
}

export function getPortfolioListQueryOptions(profileName: string) {
  return orpcQueryClient.portfolio.list.queryOptions({
    input: { profileName },
    staleTime: PORTFOLIO_STALE_TIME,
    gcTime: PORTFOLIO_GC_TIME
  });
}

export function useGetPortfolioListQuery(profileName: string, options?: { enabled?: boolean }) {
  return useQuery({
    ...getPortfolioListQueryOptions(profileName),
    // Skip reserved / invalid slugs so dashboard chrome does not spam NOT_FOUND.
    enabled: (options?.enabled ?? true) && isUsableProfileName(profileName)
  });
}

export type PortfolioListQueryResult = Awaited<ReturnType<typeof orpcClient.portfolio.list>>;
