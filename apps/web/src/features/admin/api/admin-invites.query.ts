import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

export const adminInviteQueryKeys = {
  list() {
    return orpcQueryClient.admin.invites.list.key();
  },
  signups(inviteId: string) {
    return orpcQueryClient.admin.invites.signups.key({ input: { inviteId } });
  }
};

export function getListAdminInvitesQueryOptions() {
  return orpcQueryClient.admin.invites.list.queryOptions();
}

export function useListAdminInvitesQuery() {
  return useQuery(getListAdminInvitesQueryOptions());
}

export function useAdminInviteSignupsQuery(inviteId: string | null) {
  return useQuery({
    ...orpcQueryClient.admin.invites.signups.queryOptions({
      input: { inviteId: inviteId ?? "" }
    }),
    enabled: Boolean(inviteId)
  });
}

export function useCreateNamedInviteLinkMutation() {
  const queryClient = useQueryClient();
  return useMutation(
    orpcQueryClient.admin.invites.createLink.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: adminInviteQueryKeys.list() });
      }
    })
  );
}

export function useSendAdminInviteEmailsMutation() {
  const queryClient = useQueryClient();
  return useMutation(
    orpcQueryClient.admin.invites.sendEmails.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: adminInviteQueryKeys.list() });
      }
    })
  );
}

export function useRevokeAdminInviteMutation() {
  const queryClient = useQueryClient();
  return useMutation(
    orpcQueryClient.admin.invites.revoke.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: adminInviteQueryKeys.list() });
      }
    })
  );
}

export type ListAdminInvitesQueryResult = Awaited<ReturnType<typeof orpcClient.admin.invites.list>>;
