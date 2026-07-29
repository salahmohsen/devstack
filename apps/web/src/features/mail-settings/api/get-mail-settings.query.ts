import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

export const mailSettingsQueryKeys = {
  current() {
    return orpcQueryClient.mailSettings.get.key();
  }
};

export function getMailSettingsQueryOptions() {
  return orpcQueryClient.mailSettings.get.queryOptions({
    // Settings forms keep local drafts; refetch-on-focus was wiping unsaved fields.
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });
}

export function useGetMailSettingsQuery() {
  return useQuery(getMailSettingsQueryOptions());
}

export type MailSettingsQueryResult = Awaited<ReturnType<typeof orpcClient.mailSettings.get>>;
