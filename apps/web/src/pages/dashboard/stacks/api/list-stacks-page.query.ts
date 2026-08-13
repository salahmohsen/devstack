import { type InfiniteData, useInfiniteQuery } from "@tanstack/react-query";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { STACKS_LIST_PAGE_SIZE, type StackListPageOutput, type StackOutput } from "@tsu-stack/core";

/** List data changes infrequently — avoid refetch-on-focus re-render storms. */
export const STACKS_LIST_STALE_TIME_MS = 30_000;

export type StacksListPageParam = string | null;

export function getListStacksPageInfiniteOptions() {
  return orpcQueryClient.stacks.listPage.infiniteOptions({
    input: (pageParam: StacksListPageParam) => {
      return {
        cursor: pageParam,
        limit: STACKS_LIST_PAGE_SIZE
      };
    },
    initialPageParam: null as StacksListPageParam,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: STACKS_LIST_STALE_TIME_MS
  });
}

export function useListStacksPageInfiniteQuery() {
  return useInfiniteQuery(getListStacksPageInfiniteOptions());
}

export function flattenStacksPages(
  data: InfiniteData<StackListPageOutput, StacksListPageParam> | undefined
): StackOutput[] {
  if (!data) return [];
  return data.pages.flatMap((page) => page.items);
}

export function getListStacksPageInfiniteQueryKey() {
  return orpcQueryClient.stacks.listPage.infiniteKey({
    input: (pageParam: StacksListPageParam) => {
      return {
        cursor: pageParam,
        limit: STACKS_LIST_PAGE_SIZE
      };
    },
    initialPageParam: null as StacksListPageParam
  });
}
