import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { persistedMeta } from "@/shared/lib/query-persistence";

/** Public setup for a portfolio profile (or custom-domain Host when profileName omitted). */
export function getGithubSetupStatusQueryOptions(profileName?: string) {
  return orpcQueryClient.github.getSetupStatus.queryOptions({
    input: profileName ? { profileName } : {},
    meta: persistedMeta
  });
}

export function useGetGithubSetupQuery(profileName?: string) {
  return useQuery(getGithubSetupStatusQueryOptions(profileName));
}

export type GithubSetupStatusQueryResult = Awaited<
  ReturnType<typeof orpcClient.github.getSetupStatus>
> | null;
