import { useQuery } from "@tanstack/react-query";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type ListQueryInput } from "@tsu-stack/core";

export type ResumesListSearchQuery = Pick<ListQueryInput, "q" | "filter" | "sortBy" | "sortDir">;

function resumeListInput(query: ResumesListSearchQuery = {}) {
  return {
    ...(query.q ? { q: query.q } : {}),
    ...(query.filter ? { filter: query.filter } : {}),
    ...(query.sortBy ? { sortBy: query.sortBy } : {}),
    ...(query.sortDir ? { sortDir: query.sortDir } : {})
  };
}

export function getListResumesQueryOptions(query: ResumesListSearchQuery = {}) {
  return orpcQueryClient.resume.list.queryOptions({
    input: resumeListInput(query)
  });
}

export function useListResumesQuery(query: ResumesListSearchQuery = {}) {
  return useQuery(getListResumesQueryOptions(query));
}
