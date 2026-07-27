import { useQuery } from "@tanstack/react-query";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/shared/lib/query-persistence";

export function getGithubProfileReposQueryOptions(profileName: string, isPrivate = false) {
  if (isPrivate) {
    return orpcQueryClient.github.privateGetProfileRepos.queryOptions({
      meta: persistedMeta,
      staleTime: githubCachePolicy.reposList.staleTimeMs,
      gcTime: githubCachePolicy.reposList.gcTimeMs
    });
  }
  return orpcQueryClient.github.publicGetProfileRepos.queryOptions({
    input: { profileName },
    meta: persistedMeta,
    staleTime: githubCachePolicy.reposList.staleTimeMs,
    gcTime: githubCachePolicy.reposList.gcTimeMs
  });
}

export function useGetGithubProfileReposQuery(
  profileName: string,
  isPrivate = false,
  enabled = true
) {
  return useQuery({
    ...getGithubProfileReposQueryOptions(profileName, isPrivate),
    enabled
  });
}
