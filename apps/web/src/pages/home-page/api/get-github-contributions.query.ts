import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/shared/lib/query-persistence";

export function getGithubContributionsQueryOptions(username: string, isPrivate = false) {
  if (isPrivate) {
    return orpcQueryClient.github.privateGetUserContributions.queryOptions({
      meta: persistedMeta,
      staleTime: githubCachePolicy.contributions.staleTimeMs,
      gcTime: githubCachePolicy.contributions.gcTimeMs
    });
  }
  return orpcQueryClient.github.publicGetUserContributions.queryOptions({
    input: { username },
    meta: persistedMeta,
    staleTime: githubCachePolicy.contributions.staleTimeMs,
    gcTime: githubCachePolicy.contributions.gcTimeMs
  });
}

export function useGetGithubContributionsQuery(
  username: string,
  isPrivate = false,
  enabled = true
) {
  return useQuery({
    ...getGithubContributionsQueryOptions(username, isPrivate),
    enabled
  });
}

export type GithubContributionsQueryResult = Awaited<
  ReturnType<typeof orpcClient.github.publicGetUserContributions>
>;
