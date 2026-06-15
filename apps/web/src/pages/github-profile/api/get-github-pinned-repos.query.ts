import { useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/shared/lib/query-persistence";

export function getGithubPinnedReposQueryOptions() {
  return orpc.public.github.getUserPinnedRepos.queryOptions({
    meta: persistedMeta,
    staleTime: githubCachePolicy.reposList.staleTimeMs,
    gcTime: githubCachePolicy.reposList.gcTimeMs
  });
}

export function useGetGithubPinnedReposQuery() {
  return useQuery(getGithubPinnedReposQueryOptions());
}

export type GithubPinnedReposQueryResult = Awaited<
  ReturnType<typeof client.public.github.getUserPinnedRepos>
>;
