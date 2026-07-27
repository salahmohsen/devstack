import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/shared/lib/query-persistence";

import { REPO_ACTIVITY_CARDS_PER_PAGE } from "@/pages/github-repo/api/repo-activity-cards.constants";

type GetGithubRepoIssuesInput = {
  repo: string;
  state?: "open" | "closed" | "all";
  perPage?: number;
  page?: number;
  sort?: "comments" | "created" | "updated";
  direction?: "asc" | "desc";
};

export function getGithubRepoIssuesQueryOptions(
  input: GetGithubRepoIssuesInput,
  isPrivate = false
) {
  return (
    isPrivate
      ? orpcQueryClient.github.privateGetRepoIssues
      : orpcQueryClient.github.publicGetRepoIssues
  ).queryOptions({
    input: {
      direction: input.direction ?? "desc",
      page: input.page ?? 1,
      perPage: input.perPage ?? REPO_ACTIVITY_CARDS_PER_PAGE,
      repo: input.repo,
      sort: input.sort ?? "updated",
      state: input.state ?? "open"
    },
    staleTime: githubCachePolicy.list.staleTimeMs,
    gcTime: githubCachePolicy.list.gcTimeMs,
    meta: persistedMeta
  });
}

export function useGetGithubRepoIssuesQuery(input: GetGithubRepoIssuesInput) {
  const { user } = useAuth();
  return useQuery({ ...getGithubRepoIssuesQueryOptions(input, !!user), enabled: !!user });
}

export type GithubRepoIssuesQueryResult = Awaited<
  ReturnType<typeof orpcClient.github.publicGetRepoIssues>
>;
