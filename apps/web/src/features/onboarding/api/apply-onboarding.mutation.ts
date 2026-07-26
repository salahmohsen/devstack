import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type OnboardingApplyInput } from "@tsu-stack/core";

import { onboardingQueryKeys } from "@/features/onboarding/api/get-onboarding-status.query";

export function getApplyOnboardingMutationOptions() {
  return orpcQueryClient.onboarding.apply.mutationOptions();
}

export function useApplyOnboardingMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.onboarding.apply.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: onboardingQueryKeys.status()
        });
      }
    })
  );
}

export type ApplyOnboardingMutationResult = Awaited<ReturnType<typeof orpcClient.onboarding.apply>>;

export type { OnboardingApplyInput };
