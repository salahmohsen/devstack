import { useQuery } from "@tanstack/react-query";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { APPLICATIONS_LIST_BOARD_LIMIT, type ListQueryInput } from "@tsu-stack/core";

import { APPLICATIONS_LIST_STALE_TIME_MS } from "@/features/applications/api/list-applications-page.query";

export type ApplicationsBoardSearchQuery = Pick<
  ListQueryInput,
  "q" | "filter" | "sortBy" | "sortDir"
>;

function applicationsBoardInput(query: ApplicationsBoardSearchQuery = {}) {
  return {
    limit: APPLICATIONS_LIST_BOARD_LIMIT,
    ...(query.q ? { q: query.q } : {}),
    ...(query.filter ? { filter: query.filter } : {}),
    ...(query.sortBy ? { sortBy: query.sortBy } : {}),
    ...(query.sortDir ? { sortDir: query.sortDir } : {})
  };
}

export function getListApplicationsBoardQueryOptions(query: ApplicationsBoardSearchQuery = {}) {
  return {
    ...orpcQueryClient.applications.listBoard.queryOptions({
      input: applicationsBoardInput(query)
    }),
    staleTime: APPLICATIONS_LIST_STALE_TIME_MS
  };
}

export function useListApplicationsBoardQuery(query: ApplicationsBoardSearchQuery = {}) {
  return useQuery(getListApplicationsBoardQueryOptions(query));
}

export function getListApplicationsBoardQueryKey(query: ApplicationsBoardSearchQuery = {}) {
  return orpcQueryClient.applications.listBoard.queryKey({
    input: applicationsBoardInput(query)
  });
}
