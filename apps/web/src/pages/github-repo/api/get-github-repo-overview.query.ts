import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/shared/lib/query-persistence";

export function getGithubRepoOverviewQueryOptions(
  repo: string,
  isPrivate = false,
  username?: string
) {
  if (isPrivate) {
    return orpcQueryClient.github.privateGetRepoOverview.queryOptions({
      input: { repo },
      staleTime: githubCachePolicy.repoMeta.staleTimeMs,
      gcTime: githubCachePolicy.repoMeta.gcTimeMs,
      meta: persistedMeta
    });
  }
  return orpcQueryClient.github.publicGetRepoOverview.queryOptions({
    input: { repo, username },
    staleTime: githubCachePolicy.repoMeta.staleTimeMs,
    gcTime: githubCachePolicy.repoMeta.gcTimeMs,
    meta: persistedMeta
  });
}

export function useGetGithubRepoOverviewQuery(repo: string, username: string) {
  const { user } = useAuth();
  const sessionUsername =
    typeof (user as { username?: string } | null)?.username === "string"
      ? (user as { username: string }).username
      : null;
  const isPrivate = Boolean(user && sessionUsername === username);
  return useQuery({
    ...getGithubRepoOverviewQueryOptions(repo, isPrivate, username),
    enabled: true
  });
}

export type GithubRepoOverviewQueryResult = Awaited<
  ReturnType<typeof orpcClient.github.publicGetRepoOverview>
>;
