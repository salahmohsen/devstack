import { useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/lib/github.query";

export const githubRepoActivityCardsQueryKeys = {
  byRepo(repo: string) {
    return orpc.public.github.getRepoActivityCards.queryOptions({
      input: { repo }
    }).queryKey;
  }
};

export function getGithubRepoActivityCardsQueryOptions(repo: string) {
  return orpc.public.github.getRepoActivityCards.queryOptions({
    input: { repo },
    staleTime: githubCachePolicy.activity.staleTimeMs,
    gcTime: githubCachePolicy.activity.gcTimeMs,
    retry: false,
    meta: persistedMeta
  });
}

export function useGetGithubRepoActivityCardsQuery(repo: string) {
  return useQuery(getGithubRepoActivityCardsQueryOptions(repo));
}

export type GithubRepoActivityCardsQueryResult = Awaited<
  ReturnType<typeof client.public.github.getRepoActivityCards>
>;
