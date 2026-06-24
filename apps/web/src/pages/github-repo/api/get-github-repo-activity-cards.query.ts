import { useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/shared/lib/query-persistence";

export function getGithubRepoActivityCardsQueryOptions(repo: string, isPrivate = false) {
  return (
    isPrivate ? orpc.github.privateGetRepoActivityCards : orpc.github.publicGetRepoActivityCards
  ).queryOptions({
    input: { repo },
    staleTime: githubCachePolicy.activity.staleTimeMs,
    gcTime: githubCachePolicy.activity.gcTimeMs,
    retry: false,
    meta: persistedMeta
  });
}

export function useGetGithubRepoActivityCardsQuery(repo: string) {
  const { user } = useAuth();
  return useQuery(getGithubRepoActivityCardsQueryOptions(repo, !!user));
}

export type GithubRepoActivityCardsQueryResult = Awaited<
  ReturnType<typeof client.github.publicGetRepoActivityCards>
>;
