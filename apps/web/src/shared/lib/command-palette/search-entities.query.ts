import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { SEARCH_ENTITIES_Q_MIN, type SearchEntitiesInput } from "@tsu-stack/core";

export function getSearchEntitiesQueryOptions(input: SearchEntitiesInput) {
  return orpcQueryClient.search.entities.queryOptions({
    input
  });
}

export function useSearchEntitiesQuery(q: string, signedIn: boolean) {
  const trimmed = q.trim();
  const enabled = signedIn && trimmed.length >= SEARCH_ENTITIES_Q_MIN;
  const query = useQuery({
    ...getSearchEntitiesQueryOptions({ q: enabled ? trimmed : "ab" }),
    enabled,
    retry: false
  });

  useEffect(() => {
    if (!enabled || query.status !== "error") return;
    toast.error("Couldn't search your items.");
  }, [enabled, query.errorUpdatedAt, query.status]);

  return query;
}

export type SearchEntitiesQueryResult = Awaited<ReturnType<typeof orpcClient.search.entities>>;
