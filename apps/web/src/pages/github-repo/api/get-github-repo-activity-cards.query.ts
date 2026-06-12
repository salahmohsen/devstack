import { useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { persistedMeta } from "@/lib/github.query";

export const githubRepoActivityCardsQueryKeys = {
  byRepo(owner: string, repo: string) {
    return orpc.public.github.getRepoActivityCards.queryOptions({
      input: { owner, repo }
    }).queryKey;
  }
};

export function getGithubRepoActivityCardsQueryOptions(owner: string, repo: string) {
  return orpc.public.github.getRepoActivityCards.queryOptions({
    input: { owner, repo },
    meta: persistedMeta
  });
}

export function useGetGithubRepoActivityCardsQuery(owner: string, repo: string) {
  return useQuery(getGithubRepoActivityCardsQueryOptions(owner, repo));
}

export type GithubRepoActivityCardsQueryResult = Awaited<
  ReturnType<typeof client.public.github.getRepoActivityCards>
>;
