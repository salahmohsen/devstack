import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/shared/lib/query-persistence";

export function getGithubContributionsQueryOptions(profileName: string, isPrivate = false) {
  if (isPrivate) {
    return orpcQueryClient.github.privateGetUserContributions.queryOptions({
      meta: persistedMeta,
      staleTime: githubCachePolicy.contributions.staleTimeMs,
      gcTime: githubCachePolicy.contributions.gcTimeMs
    });
  }
  return orpcQueryClient.github.publicGetUserContributions.queryOptions({
    input: { profileName },
    meta: persistedMeta,
    staleTime: githubCachePolicy.contributions.staleTimeMs,
    gcTime: githubCachePolicy.contributions.gcTimeMs
  });
}

export function useGetGithubContributionsQuery(
  profileName: string,
  isPrivate = false,
  enabled = true
) {
  return useQuery({
    ...getGithubContributionsQueryOptions(profileName, isPrivate),
    enabled
  });
}

export type GithubContributionsQueryResult = Awaited<
  ReturnType<typeof orpcClient.github.publicGetUserContributions>
>;
