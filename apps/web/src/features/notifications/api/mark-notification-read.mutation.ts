import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.notifications.markRead.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.notifications.list.key({ type: "query" })
        });
      }
    })
  );
}

export type MarkNotificationReadResult = Awaited<
  ReturnType<typeof orpcClient.notifications.markRead>
>;
