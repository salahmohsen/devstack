import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

export function useUpdateAppSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.appSettings.update.mutationOptions({
      onSuccess: async (settings) => {
        queryClient.setQueryData(orpc.appSettings.get.queryOptions().queryKey, settings);
      }
    })
  );
}

export type UpdateAppSettingsMutationResult = Awaited<ReturnType<typeof client.appSettings.update>>;
