import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/shared/lib/query-persistence";

export function getGithubRepoOverviewQueryOptions(
  repo: string,
  isPrivate = false,
  profileName?: string
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
    input: { repo, profileName },
    staleTime: githubCachePolicy.repoMeta.staleTimeMs,
    gcTime: githubCachePolicy.repoMeta.gcTimeMs,
    meta: persistedMeta
  });
}

export function useGetGithubRepoOverviewQuery(repo: string, profileName: string) {
  const { user } = useAuth();
  const sessionProfileName =
    typeof (user as { profileName?: string } | null)?.profileName === "string"
      ? (user as { profileName: string }).profileName
      : null;
  const isPrivate = Boolean(user && sessionProfileName === profileName);
  return useQuery({
    ...getGithubRepoOverviewQueryOptions(repo, isPrivate, profileName),
    enabled: true
  });
}

export type GithubRepoOverviewQueryResult = Awaited<
  ReturnType<typeof orpcClient.github.publicGetRepoOverview>
>;
