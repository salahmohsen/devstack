import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { persistedMeta } from "@/shared/lib/query-persistence";

export function getPortfolioExperiencesQueryOptions() {
  return orpcQueryClient.portfolio.experiences.list.queryOptions({
    meta: persistedMeta
  });
}

export function useGetPortfolioExperiencesQuery() {
  return useQuery(getPortfolioExperiencesQueryOptions());
}

export type PortfolioExperiencesQueryResult = Awaited<
  ReturnType<typeof orpcClient.portfolio.experiences.list>
>;
