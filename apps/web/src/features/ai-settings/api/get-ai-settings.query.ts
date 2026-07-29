import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

export const aiSettingsQueryKeys = {
  current() {
    return orpcQueryClient.aiSettings.get.key();
  }
};

export function getAiSettingsQueryOptions() {
  return orpcQueryClient.aiSettings.get.queryOptions();
}

export function useGetAiSettingsQuery() {
  return useQuery(getAiSettingsQueryOptions());
}

export type AiSettingsQueryResult = Awaited<ReturnType<typeof orpcClient.aiSettings.get>>;
