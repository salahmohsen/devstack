import { useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/shared/lib/query-persistence";

export function getGithubContributionsQueryOptions(isPrivate = false) {
  return (
    isPrivate ? orpc.github.privateGetUserContributions : orpc.github.publicGetUserContributions
  ).queryOptions({
    meta: persistedMeta,
    staleTime: githubCachePolicy.contributions.staleTimeMs,
    gcTime: githubCachePolicy.contributions.gcTimeMs
  });
}

export function useGetGithubContributionsQuery() {
  const { user } = useAuth();
  return useQuery(getGithubContributionsQueryOptions(!!user));
}

export type GithubContributionsQueryResult = Awaited<
  ReturnType<typeof client.github.publicGetUserContributions>
>;
