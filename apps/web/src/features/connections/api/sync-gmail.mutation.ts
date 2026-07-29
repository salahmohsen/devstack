import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { connectionsQueryKeys } from "@/features/connections/api/get-connections-status.query";

export function useSyncGmailMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.connections.syncGmail.mutationOptions({
      onSuccess: async (data) => {
        toast.success(
          data.imported > 0
            ? `Imported ${data.imported} message${data.imported === 1 ? "" : "s"} from Gmail`
            : "Gmail already up to date"
        );
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: connectionsQueryKeys.status() }),
          queryClient.invalidateQueries({
            queryKey: orpcQueryClient.mail.list.key({ type: "query" })
          })
        ]);
      },
      onError: (error) => {
        toast.error(error.message || "Gmail sync failed");
      }
    })
  );
}

export type SyncGmailMutationResult = Awaited<ReturnType<typeof orpcClient.connections.syncGmail>>;
