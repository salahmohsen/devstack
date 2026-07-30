import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

export const profileQueryKeys = {
  current() {
    return orpcQueryClient.profile.get.key();
  }
};

export function getProfileQueryOptions() {
  return orpcQueryClient.profile.get.queryOptions({
    // Settings forms keep local drafts; refetch-on-focus was wiping unsaved fields.
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });
}

export function useGetProfileQuery() {
  return useQuery(getProfileQueryOptions());
}

export type ProfileQueryResult = Awaited<ReturnType<typeof orpcClient.profile.get>>;
