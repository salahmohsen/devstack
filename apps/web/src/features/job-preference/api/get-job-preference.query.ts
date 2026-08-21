import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

export const jobPreferenceQueryKeys = {
  current() {
    return orpcQueryClient.jobPreference.get.key({ type: "query" });
  }
};

export function getJobPreferenceQueryOptions() {
  return orpcQueryClient.jobPreference.get.queryOptions({
    // Settings forms keep local drafts; refetch-on-focus was wiping unsaved fields.
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });
}

export function useGetJobPreferenceQuery() {
  return useQuery(getJobPreferenceQueryOptions());
}

export type JobPreferenceQueryResult = Awaited<ReturnType<typeof orpcClient.jobPreference.get>>;
