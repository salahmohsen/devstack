import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

export const onboardingQueryKeys = {
  status() {
    return orpcQueryClient.onboarding.status.key();
  }
};

export function getOnboardingStatusQueryOptions() {
  return orpcQueryClient.onboarding.status.queryOptions();
}

export function useGetOnboardingStatusQuery() {
  return useQuery(getOnboardingStatusQueryOptions());
}

export type OnboardingStatusQueryResult = Awaited<
  ReturnType<typeof orpcClient.onboarding.status>
> | null;
