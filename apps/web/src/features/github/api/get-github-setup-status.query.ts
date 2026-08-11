import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { persistedMeta } from "@/shared/lib/query-persistence";

/** Public setup for a portfolio profile (or custom-domain Host when username omitted). */
export function getGithubSetupStatusQueryOptions(username?: string) {
  return orpcQueryClient.github.getSetupStatus.queryOptions({
    input: username ? { username } : {},
    meta: persistedMeta
  });
}

export function useGetGithubSetupQuery(username?: string) {
  return useQuery(getGithubSetupStatusQueryOptions(username));
}

export type GithubSetupStatusQueryResult = Awaited<
  ReturnType<typeof orpcClient.github.getSetupStatus>
> | null;
