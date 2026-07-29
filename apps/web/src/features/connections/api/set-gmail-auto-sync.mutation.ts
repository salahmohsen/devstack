import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { connectionsQueryKeys } from "@/features/connections/api/get-connections-status.query";

export function useSetGmailAutoSyncMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.connections.setGmailAutoSync.mutationOptions({
      onSuccess: async (data) => {
        toast.success(
          data.autoSyncEnabled
            ? "Auto-sync on · Gmail will refresh about every 15 minutes"
            : "Auto-sync off"
        );
        await queryClient.invalidateQueries({ queryKey: connectionsQueryKeys.status() });
      },
      onError: (error) => {
        toast.error(error.message || "Could not update auto-sync");
      }
    })
  );
}

export type SetGmailAutoSyncMutationResult = Awaited<
  ReturnType<typeof orpcClient.connections.setGmailAutoSync>
>;
