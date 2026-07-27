import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/shared/lib/query-persistence";

export function getGithubRepoCommitSparklineQueryOptions(repo: string, profileName: string) {
  return orpcQueryClient.github.publicGetRepoCommitSparkline.queryOptions({
    input: { repo, profileName },
    staleTime: githubCachePolicy.detail.staleTimeMs,
    gcTime: githubCachePolicy.detail.gcTimeMs,
    meta: persistedMeta
  });
}

export function useGetGithubRepoCommitSparklineQuery(repo: string, profileName: string) {
  return useQuery(getGithubRepoCommitSparklineQueryOptions(repo, profileName));
}

export type GithubRepoCommitSparklineQueryResult = Awaited<
  ReturnType<typeof orpcClient.github.publicGetRepoCommitSparkline>
>;
