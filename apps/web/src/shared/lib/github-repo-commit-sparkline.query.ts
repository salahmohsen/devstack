import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/shared/lib/query-persistence";

/**
 * Owner viewing own profile → private sparkline (includes private repos).
 * Guest / other profile → public only (private repos stay empty by design).
 */
export function getGithubRepoCommitSparklineQueryOptions(
  repo: string,
  profileName: string,
  isPrivate = false
) {
  if (isPrivate) {
    return orpcQueryClient.github.privateGetRepoCommitSparkline.queryOptions({
      input: { repo },
      staleTime: githubCachePolicy.detail.staleTimeMs,
      gcTime: githubCachePolicy.detail.gcTimeMs,
      meta: persistedMeta
    });
  }
  return orpcQueryClient.github.publicGetRepoCommitSparkline.queryOptions({
    input: { repo, profileName },
    staleTime: githubCachePolicy.detail.staleTimeMs,
    gcTime: githubCachePolicy.detail.gcTimeMs,
    meta: persistedMeta
  });
}

export function useGetGithubRepoCommitSparklineQuery(repo: string, profileName: string) {
  const { user } = useAuth();
  const sessionProfileName =
    typeof (user as { profileName?: string } | null)?.profileName === "string"
      ? (user as { profileName: string }).profileName
      : null;
  const isPrivate = Boolean(user && sessionProfileName === profileName);
  return useQuery(getGithubRepoCommitSparklineQueryOptions(repo, profileName, isPrivate));
}

export type GithubRepoCommitSparklineQueryResult = Awaited<
  ReturnType<typeof orpcClient.github.publicGetRepoCommitSparkline>
>;
