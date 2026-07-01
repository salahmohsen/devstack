import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

export const listFacetsQueryKey = ["identity", "listFacets"] as const;

export function getListFacetsQueryOptions() {
  return orpcQueryClient.identity.listFacets.queryOptions({
    queryKey: [...listFacetsQueryKey]
  });
}
