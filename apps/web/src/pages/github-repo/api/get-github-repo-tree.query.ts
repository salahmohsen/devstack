import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/shared/lib/query-persistence";

export const githubRepoTreeQueryKeys = {
  byPath(repo: string, ref: string, path = "") {
    return orpcQueryClient.github.publicGetRepoTree.queryOptions({
      input: { path, ref, repo }
    }).queryKey;
  }
};

export function getGithubRepoTreeQueryOptions(
  repo: string,
  ref: string,
  path = "",
  isPrivate = false
) {
  return (
    isPrivate ? orpcQueryClient.github.privateGetRepoTree : orpcQueryClient.github.publicGetRepoTree
  ).queryOptions({
    input: { path, ref, repo },
    staleTime: githubCachePolicy.detail.staleTimeMs,
    gcTime: githubCachePolicy.detail.gcTimeMs,
    meta: persistedMeta
  });
}

export function useGetGithubRepoTreeQuery(repo: string, ref: string, path = "") {
  const { user } = useAuth();
  return useQuery(getGithubRepoTreeQueryOptions(repo, ref, path, !!user));
}

export type GithubRepoTreeQueryResult = Awaited<
  ReturnType<typeof orpcClient.github.publicGetRepoTree>
>;
