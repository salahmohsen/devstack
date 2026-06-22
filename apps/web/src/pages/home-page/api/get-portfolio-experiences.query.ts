import { useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { persistedMeta } from "@/shared/lib/query-persistence";

export function getPortfolioExperiencesQueryOptions() {
  return orpc.portfolio.experiences.list.queryOptions({
    meta: persistedMeta
  });
}

export function useGetPortfolioExperiencesQuery() {
  return useQuery(getPortfolioExperiencesQueryOptions());
}

export type PortfolioExperiencesQueryResult = Awaited<
  ReturnType<typeof client.portfolio.experiences.list>
>;
