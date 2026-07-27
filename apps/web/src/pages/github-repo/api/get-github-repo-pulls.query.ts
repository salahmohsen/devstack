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
  profileName?: string
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
      profileName
    },
    staleTime: githubCachePolicy.list.staleTimeMs,
    gcTime: githubCachePolicy.list.gcTimeMs,
    meta: persistedMeta
  });
}

export function useGetGithubRepoPullsQuery(input: GetGithubRepoPullsInput, profileName: string) {
  const { user } = useAuth();
  const sessionProfileName =
    typeof (user as { profileName?: string } | null)?.profileName === "string"
      ? (user as { profileName: string }).profileName
      : null;
  const isPrivate = Boolean(user && sessionProfileName === profileName);
  return useQuery({
    ...getGithubRepoPullsQueryOptions(input, isPrivate, profileName),
    enabled: true
  });
}

export type GithubRepoPullsQueryResult = Awaited<
  ReturnType<typeof orpcClient.github.publicGetRepoPulls>
>;
