import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/shared/lib/query-persistence";

/**
 * @param profileName Portfolio profile for public reads
 * @param isPrivate Only true when the viewer is signed in as **this** profile's user
 */
export function getGithubProfileQueryOptions(profileName: string, isPrivate = false) {
  if (isPrivate) {
    return orpcQueryClient.github.privateGetUserProfile.queryOptions({
      meta: persistedMeta,
      staleTime: githubCachePolicy.detail.staleTimeMs,
      gcTime: githubCachePolicy.detail.gcTimeMs
    });
  }
  return orpcQueryClient.github.publicGetUserProfile.queryOptions({
    input: { profileName },
    meta: persistedMeta,
    staleTime: githubCachePolicy.detail.staleTimeMs,
    gcTime: githubCachePolicy.detail.gcTimeMs
  });
}

export function useGetGithubProfileQuery(profileName: string, isPrivate = false, enabled = true) {
  return useQuery({
    ...getGithubProfileQueryOptions(profileName, isPrivate),
    enabled
  });
}

export type GithubProfileQueryResult = Awaited<
  ReturnType<typeof orpcClient.github.publicGetUserProfile>
>;
