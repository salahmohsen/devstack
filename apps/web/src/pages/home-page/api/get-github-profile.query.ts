import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/shared/lib/query-persistence";

export function getGithubProfileQueryOptions(isPrivate = false) {
  return (
    isPrivate
      ? orpcQueryClient.github.privateGetUserProfile
      : orpcQueryClient.github.publicGetUserProfile
  ).queryOptions({
    meta: persistedMeta,
    staleTime: githubCachePolicy.detail.staleTimeMs,
    gcTime: githubCachePolicy.detail.gcTimeMs
  });
}

export function useGetGithubProfileQuery() {
  const { user } = useAuth();
  return useQuery(getGithubProfileQueryOptions(!!user));
}

export type GithubProfileQueryResult = Awaited<
  ReturnType<typeof orpcClient.github.publicGetUserProfile>
>;
