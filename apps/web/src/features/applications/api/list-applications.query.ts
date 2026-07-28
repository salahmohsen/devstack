import { useQuery } from "@tanstack/react-query";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

export const applicationsQueryKeys = {
  list() {
    return orpcQueryClient.applications.list.queryKey();
  },
  get(id: string) {
    return orpcQueryClient.applications.get.queryKey({ input: { id } });
  }
};

export function getListApplicationsQueryOptions() {
  return orpcQueryClient.applications.list.queryOptions();
}

export function useListApplicationsQuery() {
  return useQuery(getListApplicationsQueryOptions());
}
