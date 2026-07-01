import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { persistedMeta } from "@/shared/lib/query-persistence";

export function getPortfolioProjectsQueryOptions() {
  return orpcQueryClient.portfolio.projects.list.queryOptions({
    meta: persistedMeta
  });
}

export function useGetPortfolioProjectsQuery() {
  return useQuery(getPortfolioProjectsQueryOptions());
}

export type PortfolioProjectsQueryResult = Awaited<
  ReturnType<typeof orpcClient.portfolio.projects.list>
>;
