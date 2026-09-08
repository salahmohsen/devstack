import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type OnboardingApplyInput } from "@tsu-stack/core";

import { invalidateExperiencesListQueries } from "@/shared/lib/invalidate-experiences-list";
import { invalidateProjectsListQueries } from "@/shared/lib/invalidate-projects-list";
import { invalidateStacksListQueries } from "@/shared/lib/invalidate-stacks-list";

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
          invalidateExperiencesListQueries(queryClient),
          invalidateProjectsListQueries(queryClient),
          invalidateStacksListQueries(queryClient),
          queryClient.invalidateQueries({
            queryKey: orpcQueryClient.educations.list.key()
          }),
          queryClient.invalidateQueries({
            queryKey: orpcQueryClient.certifications.list.key()
          }),
          queryClient.invalidateQueries({
            queryKey: orpcQueryClient.portfolio.list.key()
          }),
          queryClient.invalidateQueries({
            queryKey: orpcQueryClient.resume.list.queryKey()
          }),
          queryClient.invalidateQueries({
            queryKey: orpcQueryClient.resume.getDefault.key()
          })
        ]);
      }
    })
  );
}

export type ApplyOnboardingMutationResult = Awaited<ReturnType<typeof orpcClient.onboarding.apply>>;

export type { OnboardingApplyInput };
