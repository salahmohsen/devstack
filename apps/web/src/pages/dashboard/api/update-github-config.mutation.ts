import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

export function useUpdateGithubConfigMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.githubConfig.update.mutationOptions({
      onSuccess: async (settings) => {
        queryClient.setQueryData(
          orpcQueryClient.githubConfig.get.queryOptions().queryKey,
          settings
        );
      }
    })
  );
}

export type UpdateGithubConfigMutationResult = Awaited<
  ReturnType<typeof orpcClient.githubConfig.update>
>;
