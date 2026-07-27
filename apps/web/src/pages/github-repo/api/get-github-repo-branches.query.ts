import { useQuery } from "@tanstack/react-query";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { isValidGithubRepoSlug } from "@/shared/lib/github-repo-slug";
import { persistedMeta } from "@/shared/lib/query-persistence";

export function getGithubRepoBranchesQueryOptions(
  repo: string,
  isPrivate = false,
  profileName?: string
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
    input: { repo, profileName },
    staleTime: githubCachePolicy.repoMeta.staleTimeMs,
    gcTime: githubCachePolicy.repoMeta.gcTimeMs,
    meta: persistedMeta,
    enabled: isValidGithubRepoSlug(repo)
  });
}

export function useGetGithubRepoBranchesQuery(repo: string, profileName: string) {
  const { user } = useAuth();
  const sessionProfileName =
    typeof (user as { profileName?: string } | null)?.profileName === "string"
      ? (user as { profileName: string }).profileName
      : null;
  const isPrivate = Boolean(user && sessionProfileName === profileName);
  return useQuery(getGithubRepoBranchesQueryOptions(repo, isPrivate, profileName));
}
