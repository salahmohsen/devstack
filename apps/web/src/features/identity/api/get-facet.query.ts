import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type FacetKey } from "@tsu-stack/core/identity";

export function getFacetQueryOptions(key: FacetKey) {
  return orpc.identity.getFacet.queryOptions({
    input: { key },
    queryKey: ["identity", "getFacet", key]
  });
}
