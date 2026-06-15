import { useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/shared/lib/query-persistence";

export function getGithubRepoBranchComparisonQueryOptions(
  repo: string,
  base: string,
  head: string
) {
  return orpc.public.github.getRepoBranchComparison.queryOptions({
    input: { base, head, repo },
    staleTime: githubCachePolicy.detail.staleTimeMs,
    gcTime: githubCachePolicy.detail.gcTimeMs,
    meta: persistedMeta
  });
}

export function useGetGithubRepoBranchComparisonQuery(repo: string, base: string, head: string) {
  return useQuery({
    ...getGithubRepoBranchComparisonQueryOptions(repo, base, head),
    enabled: base !== head
  });
}

export type GithubRepoBranchComparisonQueryResult = Awaited<
  ReturnType<typeof client.public.github.getRepoBranchComparison>
>;
