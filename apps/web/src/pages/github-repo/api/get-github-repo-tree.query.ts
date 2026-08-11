import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/shared/lib/query-persistence";
import { sessionUsernameFromUser } from "@/shared/lib/session-username";

export const githubRepoTreeQueryKeys = {
  byPath(repo: string, ref: string, path = "") {
    return orpcQueryClient.github.publicGetRepoTree.queryOptions({
      input: { path, ref, repo }
    }).queryKey;
  }
};

export function getGithubRepoTreeQueryOptions(
  repo: string,
  ref: string,
  path = "",
  isPrivate = false,
  username?: string
) {
  if (isPrivate) {
    return orpcQueryClient.github.privateGetRepoTree.queryOptions({
      input: { path, ref, repo },
      staleTime: githubCachePolicy.detail.staleTimeMs,
      gcTime: githubCachePolicy.detail.gcTimeMs,
      meta: persistedMeta
    });
  }
  return orpcQueryClient.github.publicGetRepoTree.queryOptions({
    input: { path, ref, repo, username },
    staleTime: githubCachePolicy.detail.staleTimeMs,
    gcTime: githubCachePolicy.detail.gcTimeMs,
    meta: persistedMeta
  });
}

export function useGetGithubRepoTreeQuery(
  repo: string,
  ref: string,
  path = "",
  username: string,
  options?: { enabled?: boolean }
) {
  const { user } = useAuth();
  const sessionUsername = sessionUsernameFromUser(user);
  const isPrivate = Boolean(user && sessionUsername === username);
  return useQuery({
    ...getGithubRepoTreeQueryOptions(repo, ref, path, isPrivate, username),
    enabled: options?.enabled ?? true
  });
}

export type GithubRepoTreeQueryResult = Awaited<
  ReturnType<typeof orpcClient.github.publicGetRepoTree>
>;
