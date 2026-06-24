import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type FacetKey } from "@tsu-stack/core/identity";

export function getRevisionsQueryOptions(key: FacetKey, limit = 50) {
  return orpc.identity.getRevisions.queryOptions({
    input: { key, limit },
    queryKey: ["identity", "getRevisions", key, limit]
  });
}
