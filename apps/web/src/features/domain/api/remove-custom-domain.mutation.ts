import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { domainQueryKeys } from "@/features/domain/api/get-custom-domain.query";

export function getRemoveCustomDomainMutationOptions() {
  return orpcQueryClient.domain.remove.mutationOptions();
}

export function useRemoveCustomDomainMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.domain.remove.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: domainQueryKeys.current()
        });
      }
    })
  );
}

export type RemoveCustomDomainMutationResult = Awaited<ReturnType<typeof orpcClient.domain.remove>>;
