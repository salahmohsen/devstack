import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

export const notificationSettingsQueryKeys = {
  current() {
    return orpcQueryClient.notificationSettings.get.key();
  }
};

export function getNotificationSettingsQueryOptions() {
  return orpcQueryClient.notificationSettings.get.queryOptions({
    // Settings forms keep local drafts; refetch-on-focus was wiping unsaved fields.
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });
}

export function useGetNotificationSettingsQuery() {
  return useQuery(getNotificationSettingsQueryOptions());
}

export type NotificationSettingsQueryResult = Awaited<
  ReturnType<typeof orpcClient.notificationSettings.get>
>;
