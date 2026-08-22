import { type InfiniteData, useInfiniteQuery } from "@tanstack/react-query";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  STACKS_LIST_PAGE_SIZE,
  type ListQueryInput,
  type StackListPageOutput,
  type StackOutput
} from "@tsu-stack/core";

/** List data changes infrequently — avoid refetch-on-focus re-render storms. */
export const STACKS_LIST_STALE_TIME_MS = 30_000;

export type StacksListPageParam = string | null;
export type StacksListSearchQuery = Pick<ListQueryInput, "q" | "filter" | "sortBy" | "sortDir">;

function stacksListPageInput(pageParam: StacksListPageParam, query: StacksListSearchQuery = {}) {
  return {
    cursor: pageParam,
    limit: STACKS_LIST_PAGE_SIZE,
    ...(query.q ? { q: query.q } : {}),
    ...(query.filter ? { filter: query.filter } : {}),
    ...(query.sortBy ? { sortBy: query.sortBy } : {}),
    ...(query.sortDir ? { sortDir: query.sortDir } : {})
  };
}

export function getListStacksPageInfiniteOptions(query: StacksListSearchQuery = {}) {
  return orpcQueryClient.stacks.listPage.infiniteOptions({
    input: (pageParam: StacksListPageParam) => stacksListPageInput(pageParam, query),
    initialPageParam: null as StacksListPageParam,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: STACKS_LIST_STALE_TIME_MS
  });
}

export function useListStacksPageInfiniteQuery(query: StacksListSearchQuery = {}) {
  return useInfiniteQuery(getListStacksPageInfiniteOptions(query));
}

export function flattenStacksPages(
  data: InfiniteData<StackListPageOutput, StacksListPageParam> | undefined
): StackOutput[] {
  if (!data) return [];
  return data.pages.flatMap((page) => page.items);
}

export function getListStacksPageInfiniteQueryKey(query: StacksListSearchQuery = {}) {
  return orpcQueryClient.stacks.listPage.infiniteKey({
    input: (pageParam: StacksListPageParam) => stacksListPageInput(pageParam, query),
    initialPageParam: null as StacksListPageParam
  });
}
