import { useMutation, useQueryClient } from "@tanstack/react-query";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

export function useUpdateHubPersonalityMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.aiSettings.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.aiSettings.get.queryKey()
        });
      }
    })
  );
}
