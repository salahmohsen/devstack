import { useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { persistedMeta } from "@/shared/lib/query-persistence";

export function getGithubSetupStatusQueryOptions() {
  return orpc.github.getSetupStatus.queryOptions({
    meta: persistedMeta
  });
}

export function useGetGithubSetupQuery() {
  return useQuery(getGithubSetupStatusQueryOptions());
}

export type GithubSetupStatusQueryResult = Awaited<
  ReturnType<typeof client.github.getSetupStatus>
> | null;
