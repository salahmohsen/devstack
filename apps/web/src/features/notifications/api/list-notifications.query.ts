import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

export type ListNotificationsInput = {
  unreadOnly?: boolean;
  limit?: number;
};

export const notificationsQueryKeys = {
  list(input: ListNotificationsInput = {}) {
    return orpcQueryClient.notifications.list.key({
      input: {
        unreadOnly: input.unreadOnly ?? false,
        limit: input.limit
      }
    });
  }
};

export function getListNotificationsQueryOptions(input: ListNotificationsInput = {}) {
  return orpcQueryClient.notifications.list.queryOptions({
    input: {
      unreadOnly: input.unreadOnly ?? false,
      limit: input.limit ?? 30
    }
  });
}

export function useListNotificationsQuery(
  input: ListNotificationsInput = {},
  options?: { enabled?: boolean; refetchInterval?: number }
) {
  return useQuery({
    ...getListNotificationsQueryOptions(input),
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval
  });
}

export type ListNotificationsQueryResult = Awaited<
  ReturnType<typeof orpcClient.notifications.list>
>;
