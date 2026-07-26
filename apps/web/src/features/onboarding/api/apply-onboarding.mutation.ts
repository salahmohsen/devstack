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
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: onboardingQueryKeys.status()
          }),
          queryClient.invalidateQueries({
            queryKey: orpcQueryClient.profile.get.queryKey()
          }),
          queryClient.invalidateQueries({
            queryKey: orpcQueryClient.experiences.list.queryKey()
          }),
          queryClient.invalidateQueries({
            queryKey: orpcQueryClient.projects.list.queryKey()
          }),
          queryClient.invalidateQueries({
            queryKey: orpcQueryClient.stacks.list.queryKey()
          }),
          queryClient.invalidateQueries({
            queryKey: orpcQueryClient.portfolio.list.queryKey({ input: {} })
          }),
          queryClient.invalidateQueries({
            queryKey: orpcQueryClient.resume.list.queryKey()
          }),
          queryClient.invalidateQueries({
            queryKey: orpcQueryClient.resume.getDefault.queryKey()
          })
        ]);
      }
    })
  );
}

export type ApplyOnboardingMutationResult = Awaited<ReturnType<typeof orpcClient.onboarding.apply>>;

export type { OnboardingApplyInput };
