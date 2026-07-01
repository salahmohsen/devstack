import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/shared/lib/query-persistence";

export function getGithubActivityQueryOptions(page = 1, isPrivate = false) {
  return (
    isPrivate
      ? orpcQueryClient.github.privateGetUserActivity
      : orpcQueryClient.github.publicGetUserActivity
  ).queryOptions({
    input: { page },
    staleTime: githubCachePolicy.userActivity.staleTimeMs,
    gcTime: githubCachePolicy.userActivity.gcTimeMs,
    meta: persistedMeta
  });
}

export function useGetGithubActivityQuery(page = 1) {
  const { user } = useAuth();
  return useQuery(getGithubActivityQueryOptions(page, !!user));
}

export type GithubActivityQueryResult = Awaited<
  ReturnType<typeof orpcClient.github.publicGetUserActivity>
>;
