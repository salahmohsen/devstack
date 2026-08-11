import { useQuery } from "@tanstack/react-query";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { isValidGithubRepoSlug } from "@/shared/lib/github-repo-slug";
import { persistedMeta } from "@/shared/lib/query-persistence";

export function getGithubRepoBranchesQueryOptions(
  repo: string,
  isPrivate = false,
  username?: string
) {
  if (isPrivate) {
    return orpcQueryClient.github.privateGetRepoBranches.queryOptions({
      input: { repo },
      staleTime: githubCachePolicy.repoMeta.staleTimeMs,
      gcTime: githubCachePolicy.repoMeta.gcTimeMs,
      meta: persistedMeta,
      enabled: isValidGithubRepoSlug(repo)
    });
  }
  return orpcQueryClient.github.publicGetRepoBranches.queryOptions({
    input: { repo, username },
    staleTime: githubCachePolicy.repoMeta.staleTimeMs,
    gcTime: githubCachePolicy.repoMeta.gcTimeMs,
    meta: persistedMeta,
    enabled: isValidGithubRepoSlug(repo)
  });
}

export function useGetGithubRepoBranchesQuery(repo: string, username: string) {
  const { user } = useAuth();
  const sessionUsername =
    typeof (user as { username?: string } | null)?.username === "string"
      ? (user as { username: string }).username
      : null;
  const isPrivate = Boolean(user && sessionUsername === username);
  return useQuery(getGithubRepoBranchesQueryOptions(repo, isPrivate, username));
}
