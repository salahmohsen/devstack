import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type SetCustomDomainInput } from "@tsu-stack/core";

import { domainQueryKeys } from "@/features/domain/api/get-custom-domain.query";

export function getSetCustomDomainMutationOptions() {
  return orpcQueryClient.domain.set.mutationOptions();
}

export function useSetCustomDomainMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.domain.set.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: domainQueryKeys.current()
        });
      }
    })
  );
}

export type SetCustomDomainMutationResult = Awaited<ReturnType<typeof orpcClient.domain.set>>;

export type { SetCustomDomainInput };
