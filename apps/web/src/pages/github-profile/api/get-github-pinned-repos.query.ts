import { useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { persistedMeta } from "@/lib/github.query";

export const githubPinnedReposQueryKeys = {
  byUsername(username: string) {
    return orpc.public.github.getUserPinnedRepos.queryOptions({
      input: { username }
    }).queryKey;
  }
};

export function getGithubPinnedReposQueryOptions(username: string) {
  return orpc.public.github.getUserPinnedRepos.queryOptions({
    input: { username },
    meta: persistedMeta
  });
}

export function useGetGithubPinnedReposQuery(username: string) {
  return useQuery(getGithubPinnedReposQueryOptions(username));
}

export type GithubPinnedReposQueryResult = Awaited<
  ReturnType<typeof client.public.github.getUserPinnedRepos>
>;
