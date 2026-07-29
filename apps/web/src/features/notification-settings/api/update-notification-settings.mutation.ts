import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type UpdateNotificationSettingsInput } from "@tsu-stack/core";

import { notificationSettingsQueryKeys } from "@/features/notification-settings/api/get-notification-settings.query";

export function useUpdateNotificationSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.notificationSettings.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: notificationSettingsQueryKeys.current()
        });
      }
    })
  );
}

export type UpdateNotificationSettingsMutationResult = Awaited<
  ReturnType<typeof orpcClient.notificationSettings.update>
>;

export type { UpdateNotificationSettingsInput };
