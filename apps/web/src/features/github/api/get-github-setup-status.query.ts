import { useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { persistedMeta } from "@/lib/github.query";

export const githubSetupStatusQueryKeys = {
  all() {
    return orpc.public.github.getSetupStatus.queryOptions().queryKey;
  }
};

export function getGithubSetupStatusQueryOptions() {
  return orpc.public.github.getSetupStatus.queryOptions({
    meta: persistedMeta
  });
}

export function useGetGithubSetupQuery() {
  return useQuery(getGithubSetupStatusQueryOptions());
}

export type GithubSetupStatusQueryResult = Awaited<
  ReturnType<typeof client.public.github.getSetupStatus>
> | null;
