import { useMutation } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type OnboardingDiscardSourceInput } from "@tsu-stack/core";

export function getDiscardSourceMutationOptions() {
  return orpcQueryClient.onboarding.discardSource.mutationOptions();
}

export function useDiscardSourceMutation() {
  return useMutation(orpcQueryClient.onboarding.discardSource.mutationOptions());
}

export type DiscardSourceMutationResult = Awaited<
  ReturnType<typeof orpcClient.onboarding.discardSource>
>;

export type { OnboardingDiscardSourceInput };
