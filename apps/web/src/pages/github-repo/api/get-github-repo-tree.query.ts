import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/shared/lib/query-persistence";

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
  profileName?: string
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
    input: { path, ref, repo, profileName },
    staleTime: githubCachePolicy.detail.staleTimeMs,
    gcTime: githubCachePolicy.detail.gcTimeMs,
    meta: persistedMeta
  });
}

export function useGetGithubRepoTreeQuery(
  repo: string,
  ref: string,
  path = "",
  profileName: string,
  options?: { enabled?: boolean }
) {
  const { user } = useAuth();
  const sessionProfileName =
    typeof (user as { profileName?: string } | null)?.profileName === "string"
      ? (user as { profileName: string }).profileName
      : null;
  const isPrivate = Boolean(user && sessionProfileName === profileName);
  return useQuery({
    ...getGithubRepoTreeQueryOptions(repo, ref, path, isPrivate, profileName),
    enabled: options?.enabled ?? true
  });
}

export type GithubRepoTreeQueryResult = Awaited<
  ReturnType<typeof orpcClient.github.publicGetRepoTree>
>;
