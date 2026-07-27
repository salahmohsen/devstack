import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type RevokeInviteInput } from "@tsu-stack/core";

import { inviteQueryKeys } from "@/features/invite/api/list-invites.query";

export function getRevokeInviteMutationOptions() {
  return orpcQueryClient.invite.revoke.mutationOptions();
}

export function useRevokeInviteMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.invite.revoke.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: inviteQueryKeys.list()
        });
      }
    })
  );
}

export type RevokeInviteMutationResult = Awaited<ReturnType<typeof orpcClient.invite.revoke>>;

export type { RevokeInviteInput };
