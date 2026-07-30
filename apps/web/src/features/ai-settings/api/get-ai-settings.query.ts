import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

export const aiSettingsQueryKeys = {
  current() {
    return orpcQueryClient.aiSettings.get.key();
  }
};

export function getAiSettingsQueryOptions() {
  return orpcQueryClient.aiSettings.get.queryOptions({
    // Settings forms keep local drafts; refetch-on-focus was wiping unsaved fields.
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });
}

export function useGetAiSettingsQuery() {
  return useQuery(getAiSettingsQueryOptions());
}

export type AiSettingsQueryResult = Awaited<ReturnType<typeof orpcClient.aiSettings.get>>;
