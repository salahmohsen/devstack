import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

const PORTFOLIO_STALE_TIME = 1000 * 60 * 60;
const PORTFOLIO_GC_TIME = 1000 * 60 * 60 * 2;

export function getPortfolioListQueryOptions() {
  return orpcQueryClient.portfolio.list.queryOptions({
    input: {},
    staleTime: PORTFOLIO_STALE_TIME,
    gcTime: PORTFOLIO_GC_TIME
  });
}

export function useGetPortfolioListQuery() {
  return useQuery(getPortfolioListQueryOptions());
}

export type PortfolioListQueryResult = Awaited<ReturnType<typeof orpcClient.portfolio.list>>;
