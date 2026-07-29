import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type UpdateAiSettingsInput } from "@tsu-stack/core";

import { aiSettingsQueryKeys } from "@/features/ai-settings/api/get-ai-settings.query";

export function useUpdateAiSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.aiSettings.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: aiSettingsQueryKeys.current()
        });
      }
    })
  );
}

export type UpdateAiSettingsMutationResult = Awaited<
  ReturnType<typeof orpcClient.aiSettings.update>
>;

export type { UpdateAiSettingsInput };
