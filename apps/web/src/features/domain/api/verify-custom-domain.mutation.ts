import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { domainQueryKeys } from "@/features/domain/api/get-custom-domain.query";

export function getVerifyCustomDomainMutationOptions() {
  return orpcQueryClient.domain.verify.mutationOptions();
}

export function useVerifyCustomDomainMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.domain.verify.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: domainQueryKeys.current()
        });
      },
      onError: async () => {
        // Status may flip to failed on the server even when verify errors.
        await queryClient.invalidateQueries({
          queryKey: domainQueryKeys.current()
        });
      }
    })
  );
}

export type VerifyCustomDomainMutationResult = Awaited<ReturnType<typeof orpcClient.domain.verify>>;
