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
  profileName?: string
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
    input: { base, head, repo, profileName },
    staleTime: githubCachePolicy.detail.staleTimeMs,
    gcTime: githubCachePolicy.detail.gcTimeMs,
    meta: persistedMeta
  });
}

export function useGetGithubRepoBranchComparisonQuery(
  repo: string,
  base: string,
  head: string,
  profileName: string
) {
  const { user } = useAuth();
  const sessionProfileName =
    typeof (user as { profileName?: string } | null)?.profileName === "string"
      ? (user as { profileName: string }).profileName
      : null;
  const isPrivate = Boolean(user && sessionProfileName === profileName);
  return useQuery({
    ...getGithubRepoBranchComparisonQueryOptions(repo, base, head, isPrivate, profileName),
    enabled: base !== head
  });
}

export type GithubRepoBranchComparisonQueryResult = Awaited<
  ReturnType<typeof orpcClient.github.publicGetRepoBranchComparison>
>;
