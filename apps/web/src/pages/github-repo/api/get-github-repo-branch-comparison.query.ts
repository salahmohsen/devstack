import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/shared/lib/query-persistence";

export function getGithubRepoBranchComparisonQueryOptions(
  repo: string,
  base: string,
  head: string,
  isPrivate = false,
  username?: string
) {
  if (isPrivate) {
    return orpcQueryClient.github.privateGetRepoBranchComparison.queryOptions({
      input: { base, head, repo },
      staleTime: githubCachePolicy.detail.staleTimeMs,
      gcTime: githubCachePolicy.detail.gcTimeMs,
      meta: persistedMeta
    });
  }
  return orpcQueryClient.github.publicGetRepoBranchComparison.queryOptions({
    input: { base, head, repo, username },
    staleTime: githubCachePolicy.detail.staleTimeMs,
    gcTime: githubCachePolicy.detail.gcTimeMs,
    meta: persistedMeta
  });
}

export function useGetGithubRepoBranchComparisonQuery(
  repo: string,
  base: string,
  head: string,
  username: string
) {
  const { user } = useAuth();
  const sessionUsername =
    typeof (user as { username?: string } | null)?.username === "string"
      ? (user as { username: string }).username
      : null;
  const isPrivate = Boolean(user && sessionUsername === username);
  return useQuery({
    ...getGithubRepoBranchComparisonQueryOptions(repo, base, head, isPrivate, username),
    enabled: base !== head
  });
}

export type GithubRepoBranchComparisonQueryResult = Awaited<
  ReturnType<typeof orpcClient.github.publicGetRepoBranchComparison>
>;
