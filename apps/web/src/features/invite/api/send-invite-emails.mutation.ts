import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type SendInviteEmailsInput } from "@tsu-stack/core";

import { inviteQueryKeys } from "@/features/invite/api/list-invites.query";

export function useSendInviteEmailsMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.invite.send.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: inviteQueryKeys.list()
        });
      }
    })
  );
}

export type SendInviteEmailsMutationResult = Awaited<ReturnType<typeof orpcClient.invite.send>>;

export type { SendInviteEmailsInput };
