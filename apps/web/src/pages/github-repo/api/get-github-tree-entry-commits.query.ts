import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/shared/lib/query-persistence";

export function getGithubTreeEntryCommitsQueryOptions(
  repo: string,
  ref: string,
  dirPath: string,
  entries: string[],
  isPrivate = false
) {
  return (
    isPrivate
      ? orpcQueryClient.github.privateGetTreeEntryCommits
      : orpcQueryClient.github.publicGetTreeEntryCommits
  ).queryOptions({
    input: { dirPath, entries, ref, repo },
    staleTime: githubCachePolicy.detail.staleTimeMs,
    gcTime: githubCachePolicy.detail.gcTimeMs,
    retry: false,
    meta: persistedMeta
  });
}

export function useGetGithubTreeEntryCommitsQuery(
  repo: string,
  ref: string,
  dirPath: string,
  entries: string[]
) {
  const { user } = useAuth();
  return useQuery(getGithubTreeEntryCommitsQueryOptions(repo, ref, dirPath, entries, !!user));
}

export type GithubTreeEntryCommitsQueryResult = Awaited<
  ReturnType<typeof orpcClient.github.publicGetTreeEntryCommits>
>;
