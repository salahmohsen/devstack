import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type CreateInviteInput } from "@tsu-stack/core";

import { inviteQueryKeys } from "@/features/invite/api/list-invites.query";

export function getCreateInviteMutationOptions() {
  return orpcQueryClient.invite.create.mutationOptions();
}

export function useCreateInviteMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.invite.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: inviteQueryKeys.list()
        });
      }
    })
  );
}

export type CreateInviteMutationResult = Awaited<ReturnType<typeof orpcClient.invite.create>>;

export type { CreateInviteInput };
