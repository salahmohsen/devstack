import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type FacetKey } from "@tsu-stack/core/identity";

export function getFacetQueryOptions(key: FacetKey) {
  return orpcQueryClient.identity.getFacet.queryOptions({
    input: { key },
    queryKey: ["identity", "getFacet", key]
  });
}
