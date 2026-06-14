import { useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/lib/github.query";

export const githubProfileQueryKeys = () => orpc.public.github.getUserProfile.queryKey;

export function getGithubProfileQueryOptions() {
  return orpc.public.github.getUserProfile.queryOptions({
    meta: persistedMeta,
    staleTime: githubCachePolicy.detail.staleTimeMs,
    gcTime: githubCachePolicy.detail.gcTimeMs
  });
}

export function useGetGithubProfileQuery() {
  return useQuery(getGithubProfileQueryOptions());
}

export type GithubProfileQueryResult = Awaited<
  ReturnType<typeof client.public.github.getUserProfile>
>;
