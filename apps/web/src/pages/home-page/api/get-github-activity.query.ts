import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/shared/lib/query-persistence";

export function getGithubActivityQueryOptions(profileName: string, page = 1, isPrivate = false) {
  if (isPrivate) {
    return orpcQueryClient.github.privateGetUserActivity.queryOptions({
      input: { page },
      staleTime: githubCachePolicy.userActivity.staleTimeMs,
      gcTime: githubCachePolicy.userActivity.gcTimeMs,
      meta: persistedMeta
    });
  }
  return orpcQueryClient.github.publicGetUserActivity.queryOptions({
    input: { page, profileName },
    staleTime: githubCachePolicy.userActivity.staleTimeMs,
    gcTime: githubCachePolicy.userActivity.gcTimeMs,
    meta: persistedMeta
  });
}

export function useGetGithubActivityQuery(
  profileName: string,
  page = 1,
  isPrivate = false,
  enabled = true
) {
  return useQuery({
    ...getGithubActivityQueryOptions(profileName, page, isPrivate),
    enabled
  });
}

export type GithubActivityQueryResult = Awaited<
  ReturnType<typeof orpcClient.github.publicGetUserActivity>
>;
