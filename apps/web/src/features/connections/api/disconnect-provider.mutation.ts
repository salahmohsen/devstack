import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { connectionsQueryKeys } from "@/features/connections/api/get-connections-status.query";

export function useDisconnectProviderMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.connections.disconnectProvider.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: connectionsQueryKeys.status() });
      }
    })
  );
}

export type DisconnectProviderMutationResult = Awaited<
  ReturnType<typeof orpcClient.connections.disconnectProvider>
>;
