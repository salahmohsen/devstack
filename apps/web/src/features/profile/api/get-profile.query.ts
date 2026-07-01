import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

export const getProfileQueryKey = ["profile", "get"] as const;

export function getProfileQueryOptions() {
  return orpcQueryClient.profile.get.queryOptions({
    queryKey: [...getProfileQueryKey]
  });
}
