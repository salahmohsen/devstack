import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/shared/lib/query-persistence";

import { REPO_ACTIVITY_CARDS_PER_PAGE } from "@/pages/github-repo/api/repo-activity-cards.constants";

type GetGithubRepoDiscussionsInput = {
  repo: string;
  first?: number;
};

export function getGithubRepoDiscussionsQueryOptions(
  input: GetGithubRepoDiscussionsInput,
  isPrivate = false
) {
  return (
    isPrivate
      ? orpcQueryClient.github.privateGetRepoDiscussions
      : orpcQueryClient.github.publicGetRepoDiscussions
  ).queryOptions({
    input: {
      first: input.first ?? REPO_ACTIVITY_CARDS_PER_PAGE,
      repo: input.repo
    },
    staleTime: githubCachePolicy.list.staleTimeMs,
    gcTime: githubCachePolicy.list.gcTimeMs,
    meta: persistedMeta
  });
}

export function useGetGithubRepoDiscussionsQuery(input: GetGithubRepoDiscussionsInput) {
  const { user } = useAuth();
  return useQuery({ ...getGithubRepoDiscussionsQueryOptions(input, !!user), enabled: !!user });
}

export type GithubRepoDiscussionsQueryResult = Awaited<
  ReturnType<typeof orpcClient.github.publicGetRepoDiscussions>
>;
