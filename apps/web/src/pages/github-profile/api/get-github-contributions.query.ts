import { useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { persistedMeta } from "@/lib/github.query";

export const githubContributionsQueryKeys = {
  byUsername(username: string) {
    return orpc.public.github.getUserContributions.queryOptions({
      input: { username }
    }).queryKey;
  }
};

export function getGithubContributionsQueryOptions(username: string) {
  return orpc.public.github.getUserContributions.queryOptions({
    input: { username },
    meta: persistedMeta
  });
}

export function useGetGithubContributionsQuery(username: string) {
  return useQuery(getGithubContributionsQueryOptions(username));
}

export type GithubContributionsQueryResult = Awaited<
  ReturnType<typeof client.public.github.getUserContributions>
>;
