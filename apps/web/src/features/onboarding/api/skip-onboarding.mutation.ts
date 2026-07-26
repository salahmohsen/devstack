import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type OnboardingSkipInput } from "@tsu-stack/core";

import { onboardingQueryKeys } from "@/features/onboarding/api/get-onboarding-status.query";

export function getSkipOnboardingMutationOptions() {
  return orpcQueryClient.onboarding.skip.mutationOptions();
}

export function useSkipOnboardingMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.onboarding.skip.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: onboardingQueryKeys.status()
        });
      }
    })
  );
}

export type SkipOnboardingMutationResult = Awaited<ReturnType<typeof orpcClient.onboarding.skip>>;

export type { OnboardingSkipInput };
