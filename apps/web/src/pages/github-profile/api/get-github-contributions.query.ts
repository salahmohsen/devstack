import { useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/shared/lib/query-persistence";

export function getGithubContributionsQueryOptions() {
  return orpc.public.github.getUserContributions.queryOptions({
    meta: persistedMeta,
    staleTime: githubCachePolicy.contributions.staleTimeMs,
    gcTime: githubCachePolicy.contributions.gcTimeMs
  });
}

export function useGetGithubContributionsQuery() {
  return useQuery(getGithubContributionsQueryOptions());
}

export type GithubContributionsQueryResult = Awaited<
  ReturnType<typeof client.public.github.getUserContributions>
>;
