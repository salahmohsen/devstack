import { type InfiniteData, useInfiniteQuery } from "@tanstack/react-query";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  EXPERIENCES_LIST_PAGE_SIZE,
  type ExperienceListPageOutput,
  type ExperienceOutput
} from "@tsu-stack/core";

/** List data changes infrequently — avoid refetch-on-focus re-render storms. */
export const EXPERIENCES_LIST_STALE_TIME_MS = 30_000;

export type ExperiencesListPageParam = string | null;

export function getListExperiencesPageInfiniteOptions() {
  return orpcQueryClient.experiences.listPage.infiniteOptions({
    input: (pageParam: ExperiencesListPageParam) => {
      return {
        cursor: pageParam,
        limit: EXPERIENCES_LIST_PAGE_SIZE
      };
    },
    initialPageParam: null as ExperiencesListPageParam,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: EXPERIENCES_LIST_STALE_TIME_MS
  });
}

export function useListExperiencesPageInfiniteQuery() {
  return useInfiniteQuery(getListExperiencesPageInfiniteOptions());
}

export function flattenExperiencesPages(
  data: InfiniteData<ExperienceListPageOutput, ExperiencesListPageParam> | undefined
): ExperienceOutput[] {
  if (!data) return [];
  return data.pages.flatMap((page) => page.items);
}

export function getListExperiencesPageInfiniteQueryKey() {
  return orpcQueryClient.experiences.listPage.infiniteKey({
    input: (pageParam: ExperiencesListPageParam) => {
      return {
        cursor: pageParam,
        limit: EXPERIENCES_LIST_PAGE_SIZE
      };
    },
    initialPageParam: null as ExperiencesListPageParam
  });
}
