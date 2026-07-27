import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/shared/lib/query-persistence";

export function getGithubPinnedReposQueryOptions(profileName: string, isPrivate = false) {
  if (isPrivate) {
    return orpcQueryClient.github.privateGetUserPinnedRepos.queryOptions({
      meta: persistedMeta,
      staleTime: githubCachePolicy.reposList.staleTimeMs,
      gcTime: githubCachePolicy.reposList.gcTimeMs
    });
  }
  return orpcQueryClient.github.publicGetUserPinnedRepos.queryOptions({
    input: { profileName },
    meta: persistedMeta,
    staleTime: githubCachePolicy.reposList.staleTimeMs,
    gcTime: githubCachePolicy.reposList.gcTimeMs
  });
}

export function useGetGithubPinnedReposQuery(
  profileName: string,
  isPrivate = false,
  enabled = true
) {
  return useQuery({
    ...getGithubPinnedReposQueryOptions(profileName, isPrivate),
    enabled
  });
}

export type GithubPinnedReposQueryResult = Awaited<
  ReturnType<typeof orpcClient.github.publicGetUserPinnedRepos>
>;
