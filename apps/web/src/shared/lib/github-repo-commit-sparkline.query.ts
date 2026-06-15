import { useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/shared/lib/query-persistence";

export function getGithubRepoCommitSparklineQueryOptions(repo: string) {
  return orpc.public.github.getRepoCommitSparkline.queryOptions({
    input: { repo },
    staleTime: githubCachePolicy.detail.staleTimeMs,
    gcTime: githubCachePolicy.detail.gcTimeMs,
    meta: persistedMeta
  });
}

export function useGetGithubRepoCommitSparklineQuery(repo: string) {
  return useQuery(getGithubRepoCommitSparklineQueryOptions(repo));
}

export type GithubRepoCommitSparklineQueryResult = Awaited<
  ReturnType<typeof client.public.github.getRepoCommitSparkline>
>;
