import { type InfiniteData, useInfiniteQuery } from "@tanstack/react-query";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  PROJECTS_LIST_PAGE_SIZE,
  type ListQueryInput,
  type ProjectListPageOutput,
  type ProjectOutput
} from "@tsu-stack/core";

/** List data changes infrequently — avoid refetch-on-focus re-render storms. */
export const PROJECTS_LIST_STALE_TIME_MS = 30_000;

export type ProjectsListPageParam = string | null;
export type ProjectsListSearchQuery = Pick<ListQueryInput, "q" | "filter" | "sortBy" | "sortDir">;

function projectsListPageInput(
  pageParam: ProjectsListPageParam,
  query: ProjectsListSearchQuery = {}
) {
  return {
    cursor: pageParam,
    limit: PROJECTS_LIST_PAGE_SIZE,
    ...(query.q ? { q: query.q } : {}),
    ...(query.filter ? { filter: query.filter } : {}),
    ...(query.sortBy ? { sortBy: query.sortBy } : {}),
    ...(query.sortDir ? { sortDir: query.sortDir } : {})
  };
}

export function getListProjectsPageInfiniteOptions(query: ProjectsListSearchQuery = {}) {
  return orpcQueryClient.projects.listPage.infiniteOptions({
    input: (pageParam: ProjectsListPageParam) => projectsListPageInput(pageParam, query),
    initialPageParam: null as ProjectsListPageParam,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: PROJECTS_LIST_STALE_TIME_MS
  });
}

export function useListProjectsPageInfiniteQuery(query: ProjectsListSearchQuery = {}) {
  return useInfiniteQuery(getListProjectsPageInfiniteOptions(query));
}

export function flattenProjectsPages(
  data: InfiniteData<ProjectListPageOutput, ProjectsListPageParam> | undefined
): ProjectOutput[] {
  if (!data) return [];
  return data.pages.flatMap((page) => page.items);
}

export function getListProjectsPageInfiniteQueryKey(query: ProjectsListSearchQuery = {}) {
  return orpcQueryClient.projects.listPage.infiniteKey({
    input: (pageParam: ProjectsListPageParam) => projectsListPageInput(pageParam, query),
    initialPageParam: null as ProjectsListPageParam
  });
}
