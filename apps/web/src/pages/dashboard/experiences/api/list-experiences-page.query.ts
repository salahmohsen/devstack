import { type InfiniteData, useInfiniteQuery } from "@tanstack/react-query";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  EXPERIENCES_LIST_PAGE_SIZE,
  type ExperienceListPageOutput,
  type ExperienceOutput,
  type ListQueryInput
} from "@tsu-stack/core";

/** List data changes infrequently — avoid refetch-on-focus re-render storms. */
export const EXPERIENCES_LIST_STALE_TIME_MS = 30_000;

export type ExperiencesListPageParam = string | null;
export type ExperiencesListSearchQuery = Pick<
  ListQueryInput,
  "q" | "filter" | "sortBy" | "sortDir"
>;

function experiencesListPageInput(
  pageParam: ExperiencesListPageParam,
  query: ExperiencesListSearchQuery = {}
) {
  return {
    cursor: pageParam,
    limit: EXPERIENCES_LIST_PAGE_SIZE,
    ...(query.q ? { q: query.q } : {}),
    ...(query.filter ? { filter: query.filter } : {}),
    ...(query.sortBy ? { sortBy: query.sortBy } : {}),
    ...(query.sortDir ? { sortDir: query.sortDir } : {})
  };
}

export function getListExperiencesPageInfiniteOptions(query: ExperiencesListSearchQuery = {}) {
  return orpcQueryClient.experiences.listPage.infiniteOptions({
    input: (pageParam: ExperiencesListPageParam) => experiencesListPageInput(pageParam, query),
    initialPageParam: null as ExperiencesListPageParam,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: EXPERIENCES_LIST_STALE_TIME_MS
  });
}

export function useListExperiencesPageInfiniteQuery(query: ExperiencesListSearchQuery = {}) {
  return useInfiniteQuery(getListExperiencesPageInfiniteOptions(query));
}

export function flattenExperiencesPages(
  data: InfiniteData<ExperienceListPageOutput, ExperiencesListPageParam> | undefined
): ExperienceOutput[] {
  if (!data) return [];
  return data.pages.flatMap((page) => page.items);
}

export function getListExperiencesPageInfiniteQueryKey(query: ExperiencesListSearchQuery = {}) {
  return orpcQueryClient.experiences.listPage.infiniteKey({
    input: (pageParam: ExperiencesListPageParam) => experiencesListPageInput(pageParam, query),
    initialPageParam: null as ExperiencesListPageParam
  });
}
