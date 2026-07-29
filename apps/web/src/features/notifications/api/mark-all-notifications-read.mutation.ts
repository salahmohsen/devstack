import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.notifications.markAllRead.mutationOptions({
      onSuccess: async (data) => {
        if (data.updated > 0) {
          toast.success(`Marked ${data.updated} read`);
        }
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.notifications.list.key({ type: "query" })
        });
      }
    })
  );
}

export type MarkAllNotificationsReadResult = Awaited<
  ReturnType<typeof orpcClient.notifications.markAllRead>
>;
