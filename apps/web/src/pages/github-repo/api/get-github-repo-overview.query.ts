import { useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/lib/github.query";

export function getGithubRepoOverviewQueryOptions(repo: string) {
  return orpc.public.github.getRepoOverview.queryOptions({
    input: { repo },
    staleTime: githubCachePolicy.repoMeta.staleTimeMs,
    gcTime: githubCachePolicy.repoMeta.gcTimeMs,
    meta: persistedMeta
  });
}

export function useGetGithubRepoOverviewQuery(repo: string) {
  return useQuery(getGithubRepoOverviewQueryOptions(repo));
}

export type GithubRepoOverviewQueryResult = Awaited<
  ReturnType<typeof client.public.github.getRepoOverview>
>;
