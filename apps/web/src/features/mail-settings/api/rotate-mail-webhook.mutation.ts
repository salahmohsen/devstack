import { useMutation, useQueryClient } from "@tanstack/react-query";

import { orpcClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { mailSettingsQueryKeys } from "@/features/mail-settings/api/get-mail-settings.query";

export function useRotateMailWebhookMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => orpcClient.mailSettings.update({ rotateWebhookToken: true }),
    onSuccess: async (data) => {
      queryClient.setQueryData(mailSettingsQueryKeys.current(), data);
      await queryClient.invalidateQueries({
        queryKey: mailSettingsQueryKeys.current()
      });
    }
  });
}

export type RotateMailWebhookMutationResult = Awaited<
  ReturnType<typeof orpcClient.mailSettings.update>
>;
