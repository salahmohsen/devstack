import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

const PORTFOLIO_STALE_TIME = 1000 * 60 * 60;
const PORTFOLIO_GC_TIME = 1000 * 60 * 60 * 2;

/** Base key — invalidates every public portfolio list regardless of profileName. */
export function getPortfolioListQueryKey() {
  return orpcQueryClient.portfolio.list.key();
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
    enabled: (options?.enabled ?? true) && Boolean(profileName)
  });
}

export type PortfolioListQueryResult = Awaited<ReturnType<typeof orpcClient.portfolio.list>>;
