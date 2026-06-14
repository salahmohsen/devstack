import { useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/lib/github.query";

export const githubProfileReposQueryKeys = () => orpc.public.github.getProfileRepos.queryKey;

export function getGithubProfileReposQueryOptions() {
  return orpc.public.github.getProfileRepos.queryOptions({
    meta: persistedMeta,
    staleTime: githubCachePolicy.reposList.staleTimeMs,
    gcTime: githubCachePolicy.reposList.gcTimeMs
  });
}

export function useGetGithubProfileReposQuery(enabled = true) {
  return useQuery({
    ...getGithubProfileReposQueryOptions(),
    enabled
  });
}

export type GithubProfileReposQueryResult = Awaited<
  ReturnType<typeof client.public.github.getProfileRepos>
>;
