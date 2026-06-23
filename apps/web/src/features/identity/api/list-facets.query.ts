import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

export const listFacetsQueryKey = ["identity", "listFacets"] as const;

export function getListFacetsQueryOptions() {
  return orpc.identity.listFacets.queryOptions({
    queryKey: [...listFacetsQueryKey]
  });
}
