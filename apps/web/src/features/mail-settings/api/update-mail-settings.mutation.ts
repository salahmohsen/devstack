import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type UpdateMailSettingsInput } from "@tsu-stack/core";

import { mailSettingsQueryKeys } from "@/features/mail-settings/api/get-mail-settings.query";

export function useUpdateMailSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.mailSettings.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: mailSettingsQueryKeys.current()
        });
      }
    })
  );
}

export type UpdateMailSettingsMutationResult = Awaited<
  ReturnType<typeof orpcClient.mailSettings.update>
>;

export type { UpdateMailSettingsInput };
