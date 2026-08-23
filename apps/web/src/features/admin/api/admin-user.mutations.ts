import { useMutation, useQueryClient } from "@tanstack/react-query";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

function invalidateUsers(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: orpcQueryClient.admin.users.key() });
}

export function useAdminSetRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation(
    orpcQueryClient.admin.users.setRole.mutationOptions({
      onSuccess: async () => {
        await invalidateUsers(queryClient);
      }
    })
  );
}

export function useAdminBanUserMutation() {
  const queryClient = useQueryClient();
  return useMutation(
    orpcQueryClient.admin.users.ban.mutationOptions({
      onSuccess: async () => {
        await invalidateUsers(queryClient);
      }
    })
  );
}

export function useAdminUnbanUserMutation() {
  const queryClient = useQueryClient();
  return useMutation(
    orpcQueryClient.admin.users.unban.mutationOptions({
      onSuccess: async () => {
        await invalidateUsers(queryClient);
      }
    })
  );
}

export function useAdminRevokeSessionsMutation() {
  const queryClient = useQueryClient();
  return useMutation(
    orpcQueryClient.admin.users.revokeSessions.mutationOptions({
      onSuccess: async () => {
        await invalidateUsers(queryClient);
      }
    })
  );
}
