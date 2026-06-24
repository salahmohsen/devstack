import { useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/shared/lib/query-persistence";

export function getGithubRepoOverviewQueryOptions(repo: string, isPrivate = false) {
  return (
    isPrivate ? orpc.github.privateGetRepoOverview : orpc.github.publicGetRepoOverview
  ).queryOptions({
    input: { repo },
    staleTime: githubCachePolicy.repoMeta.staleTimeMs,
    gcTime: githubCachePolicy.repoMeta.gcTimeMs,
    meta: persistedMeta
  });
}

export function useGetGithubRepoOverviewQuery(repo: string) {
  const { user } = useAuth();
  return useQuery(getGithubRepoOverviewQueryOptions(repo, !!user));
}

export type GithubRepoOverviewQueryResult = Awaited<
  ReturnType<typeof client.github.publicGetRepoOverview>
>;
