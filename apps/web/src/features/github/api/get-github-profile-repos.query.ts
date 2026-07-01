import { useQuery } from "@tanstack/react-query";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/shared/lib/query-persistence";

export function getGithubProfileReposQueryOptions(isPrivate = false) {
  return (
    isPrivate
      ? orpcQueryClient.github.privateGetProfileRepos
      : orpcQueryClient.github.publicGetProfileRepos
  ).queryOptions({
    meta: persistedMeta,
    staleTime: githubCachePolicy.reposList.staleTimeMs,
    gcTime: githubCachePolicy.reposList.gcTimeMs
  });
}

export function useGetGithubProfileReposQuery(enabled = true) {
  const { user } = useAuth();
  return useQuery({
    ...getGithubProfileReposQueryOptions(!!user),
    enabled
  });
}
