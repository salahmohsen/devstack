import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

export const adminAccessQueryKeys = {
  get() {
    return orpcQueryClient.admin.access.get.key();
  }
};

export function getAdminAccessQueryOptions() {
  return orpcQueryClient.admin.access.get.queryOptions();
}

export function useAdminAccessQuery() {
  return useQuery(getAdminAccessQueryOptions());
}

export function useSetSignupModeMutation() {
  const queryClient = useQueryClient();
  return useMutation(
    orpcQueryClient.admin.access.setSignupMode.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: adminAccessQueryKeys.get() }),
          queryClient.invalidateQueries({ queryKey: orpcQueryClient.signupPolicy.get.key() })
        ]);
      }
    })
  );
}
