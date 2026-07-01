import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { persistedMeta } from "@/shared/lib/query-persistence";

export function getGithubSetupStatusQueryOptions() {
  return orpcQueryClient.github.getSetupStatus.queryOptions({
    meta: persistedMeta
  });
}

export function useGetGithubSetupQuery() {
  return useQuery(getGithubSetupStatusQueryOptions());
}

export type GithubSetupStatusQueryResult = Awaited<
  ReturnType<typeof orpcClient.github.getSetupStatus>
> | null;
