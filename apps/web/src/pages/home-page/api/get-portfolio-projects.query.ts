import { useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { persistedMeta } from "@/shared/lib/query-persistence";

export function getPortfolioProjectsQueryOptions() {
  return orpc.portfolio.projects.list.queryOptions({
    meta: persistedMeta
  });
}

export function useGetPortfolioProjectsQuery() {
  return useQuery(getPortfolioProjectsQueryOptions());
}

export type PortfolioProjectsQueryResult = Awaited<
  ReturnType<typeof client.portfolio.projects.list>
>;
