import { type InfiniteData, useInfiniteQuery } from "@tanstack/react-query";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  APPLICATIONS_LIST_PAGE_SIZE,
  type ApplicationListPageOutput,
  type ApplicationListScope,
  type ApplicationOutput,
  type ListQueryInput
} from "@tsu-stack/core";

export const APPLICATIONS_LIST_STALE_TIME_MS = 15_000;

export type ApplicationsListPageParam = string | null;
export type ApplicationsListSearchQuery = Pick<
  ListQueryInput,
  "q" | "filter" | "sortBy" | "sortDir"
> & {
  scope: ApplicationListScope;
};

function applicationsListPageInput(
  pageParam: ApplicationsListPageParam,
  query: ApplicationsListSearchQuery
) {
  return {
    cursor: pageParam,
    limit: APPLICATIONS_LIST_PAGE_SIZE,
    scope: query.scope,
    ...(query.q ? { q: query.q } : {}),
    ...(query.filter ? { filter: query.filter } : {}),
    ...(query.sortBy ? { sortBy: query.sortBy } : {}),
    ...(query.sortDir ? { sortDir: query.sortDir } : {})
  };
}

export function getListApplicationsPageInfiniteOptions(query: ApplicationsListSearchQuery) {
  return orpcQueryClient.applications.listPage.infiniteOptions({
    input: (pageParam: ApplicationsListPageParam) => applicationsListPageInput(pageParam, query),
    initialPageParam: null as ApplicationsListPageParam,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: APPLICATIONS_LIST_STALE_TIME_MS
  });
}

export function useListApplicationsPageInfiniteQuery(query: ApplicationsListSearchQuery) {
  return useInfiniteQuery(getListApplicationsPageInfiniteOptions(query));
}

export function flattenApplicationsPages(
  data: InfiniteData<ApplicationListPageOutput, ApplicationsListPageParam> | undefined
): ApplicationOutput[] {
  if (!data) return [];
  return data.pages.flatMap((page) => page.items);
}

export function getListApplicationsPageInfiniteQueryKey(query: ApplicationsListSearchQuery) {
  return orpcQueryClient.applications.listPage.infiniteKey({
    input: (pageParam: ApplicationsListPageParam) => applicationsListPageInput(pageParam, query),
    initialPageParam: null as ApplicationsListPageParam
  });
}
