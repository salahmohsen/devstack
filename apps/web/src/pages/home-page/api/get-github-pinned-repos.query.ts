import { useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/shared/lib/query-persistence";

export function getGithubPinnedReposQueryOptions(isPrivate = false) {
  return (
    isPrivate ? orpc.github.privateGetUserPinnedRepos : orpc.github.publicGetUserPinnedRepos
  ).queryOptions({
    meta: persistedMeta,
    staleTime: githubCachePolicy.reposList.staleTimeMs,
    gcTime: githubCachePolicy.reposList.gcTimeMs
  });
}

export function useGetGithubPinnedReposQuery() {
  const { user } = useAuth();
  return useQuery(getGithubPinnedReposQueryOptions(!!user));
}

export type GithubPinnedReposQueryResult = Awaited<
  ReturnType<typeof client.github.publicGetUserPinnedRepos>
>;
