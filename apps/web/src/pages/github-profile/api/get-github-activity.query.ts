import { useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/shared/lib/query-persistence";

export function getGithubActivityQueryOptions(page = 1) {
  return orpc.public.github.getUserActivity.queryOptions({
    input: { page },
    staleTime: githubCachePolicy.userActivity.staleTimeMs,
    gcTime: githubCachePolicy.userActivity.gcTimeMs,
    meta: persistedMeta
  });
}

export function useGetGithubActivityQuery(page = 1) {
  return useQuery(getGithubActivityQueryOptions(page));
}

export type GithubActivityQueryResult = Awaited<
  ReturnType<typeof client.public.github.getUserActivity>
>;
