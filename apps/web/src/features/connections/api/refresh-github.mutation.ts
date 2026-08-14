import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { connectionsQueryKeys } from "@/features/connections/api/get-connections-status.query";

export function useRefreshGithubMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.connections.refreshGithub.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: connectionsQueryKeys.status() });
      }
    })
  );
}

export type RefreshGithubMutationResult = Awaited<
  ReturnType<typeof orpcClient.connections.refreshGithub>
>;
