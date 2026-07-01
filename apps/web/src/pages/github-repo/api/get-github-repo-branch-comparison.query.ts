import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/shared/lib/query-persistence";

export function getGithubRepoBranchComparisonQueryOptions(
  repo: string,
  base: string,
  head: string,
  isPrivate = false
) {
  return (
    isPrivate
      ? orpcQueryClient.github.privateGetRepoBranchComparison
      : orpcQueryClient.github.publicGetRepoBranchComparison
  ).queryOptions({
    input: { base, head, repo },
    staleTime: githubCachePolicy.detail.staleTimeMs,
    gcTime: githubCachePolicy.detail.gcTimeMs,
    meta: persistedMeta
  });
}

export function useGetGithubRepoBranchComparisonQuery(repo: string, base: string, head: string) {
  const { user } = useAuth();
  return useQuery({
    ...getGithubRepoBranchComparisonQueryOptions(repo, base, head, !!user),
    enabled: base !== head
  });
}

export type GithubRepoBranchComparisonQueryResult = Awaited<
  ReturnType<typeof orpcClient.github.publicGetRepoBranchComparison>
>;
