import { useQuery } from "@tanstack/react-query";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/shared/lib/query-persistence";

export function getGithubRepoBranchesQueryOptions(repo: string, isPrivate = false) {
  return (
    isPrivate
      ? orpcQueryClient.github.privateGetRepoBranches
      : orpcQueryClient.github.publicGetRepoBranches
  ).queryOptions({
    input: { repo },
    staleTime: githubCachePolicy.repoMeta.staleTimeMs,
    gcTime: githubCachePolicy.repoMeta.gcTimeMs,
    meta: persistedMeta
  });
}

export function useGetGithubRepoBranchesQuery(repo: string) {
  const { user } = useAuth();
  return useQuery(getGithubRepoBranchesQueryOptions(repo, !!user));
}
