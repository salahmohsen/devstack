import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/shared/lib/query-persistence";

import { REPO_ACTIVITY_CARDS_PER_PAGE } from "@/pages/github-repo/api/repo-activity-cards.constants";

type GetGithubRepoWorkflowRunsInput = {
  repo: string;
  perPage?: number;
  page?: number;
};

export function getGithubRepoWorkflowRunsQueryOptions(
  input: GetGithubRepoWorkflowRunsInput,
  isPrivate = false
) {
  return (
    isPrivate
      ? orpcQueryClient.github.privateGetRepoWorkflowRuns
      : orpcQueryClient.github.publicGetRepoWorkflowRuns
  ).queryOptions({
    input: {
      page: input.page ?? 1,
      perPage: input.perPage ?? REPO_ACTIVITY_CARDS_PER_PAGE,
      repo: input.repo
    },
    staleTime: githubCachePolicy.list.staleTimeMs,
    gcTime: githubCachePolicy.list.gcTimeMs,
    meta: persistedMeta
  });
}

export function useGetGithubRepoWorkflowRunsQuery(input: GetGithubRepoWorkflowRunsInput) {
  const { user } = useAuth();
  return useQuery(getGithubRepoWorkflowRunsQueryOptions(input, !!user));
}

export type GithubRepoWorkflowRunsQueryResult = Awaited<
  ReturnType<typeof orpcClient.github.publicGetRepoWorkflowRuns>
>;
