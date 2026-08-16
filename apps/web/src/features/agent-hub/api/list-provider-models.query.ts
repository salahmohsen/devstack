import { queryOptions, useQueries } from "@tanstack/react-query";

import { orpcClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type AiProviderPublic } from "@tsu-stack/core";

export function providerModelsQueryKey(providerId: string, kind: string) {
  return ["ai-settings", "provider-models", providerId, kind] as const;
}

export function providerModelsQueryOptions(row: Pick<AiProviderPublic, "id" | "kind">) {
  return queryOptions({
    queryKey: providerModelsQueryKey(row.id, row.kind),
    queryFn: () =>
      orpcClient.aiSettings.listProviderModels({
        kind: row.kind,
        providerId: row.id
      }),
    staleTime: 15 * 60 * 1000
  });
}

export function useConfiguredProviderModelsQueries(providers: AiProviderPublic[]) {
  const ready = providers.filter((row) => row.hasApiKey);
  return useQueries({
    queries: ready.map((row) => providerModelsQueryOptions(row))
  });
}
