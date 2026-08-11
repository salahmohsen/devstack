import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/shared/lib/query-persistence";

import { REPO_ACTIVITY_CARDS_PER_PAGE } from "@/pages/github-repo/api/repo-activity-cards.constants";

type GetGithubRepoPullsInput = {
  repo: string;
  state?: "open" | "closed" | "all";
  perPage?: number;
  page?: number;
  sort?: "created" | "long-running" | "popularity" | "updated";
  direction?: "asc" | "desc";
};

export function getGithubRepoPullsQueryOptions(
  input: GetGithubRepoPullsInput,
  isPrivate = false,
  username?: string
) {
  if (isPrivate) {
    return orpcQueryClient.github.privateGetRepoPulls.queryOptions({
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
  return orpcQueryClient.github.publicGetRepoPulls.queryOptions({
    input: {
      direction: input.direction ?? "desc",
      page: input.page ?? 1,
      perPage: input.perPage ?? REPO_ACTIVITY_CARDS_PER_PAGE,
      repo: input.repo,
      sort: input.sort ?? "updated",
      state: input.state ?? "open",
      username
    },
    staleTime: githubCachePolicy.list.staleTimeMs,
    gcTime: githubCachePolicy.list.gcTimeMs,
    meta: persistedMeta
  });
}

export function useGetGithubRepoPullsQuery(input: GetGithubRepoPullsInput, username: string) {
  const { user } = useAuth();
  const sessionUsername =
    typeof (user as { username?: string } | null)?.username === "string"
      ? (user as { username: string }).username
      : null;
  const isPrivate = Boolean(user && sessionUsername === username);
  return useQuery({
    ...getGithubRepoPullsQueryOptions(input, isPrivate, username),
    enabled: true
  });
}

export type GithubRepoPullsQueryResult = Awaited<
  ReturnType<typeof orpcClient.github.publicGetRepoPulls>
>;
