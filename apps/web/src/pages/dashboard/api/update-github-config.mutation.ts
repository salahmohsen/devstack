import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

export function useUpdateGithubConfigMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.githubConfig.update.mutationOptions({
      onSuccess: async (settings) => {
        queryClient.setQueryData(orpc.githubConfig.get.queryOptions().queryKey, settings);
      }
    })
  );
}

export type UpdateGithubConfigMutationResult = Awaited<
  ReturnType<typeof client.githubConfig.update>
>;
