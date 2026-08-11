import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/shared/lib/query-persistence";
import { sessionUsernameFromUser } from "@/shared/lib/session-username";

/**
 * Owner viewing own profile → private sparkline (includes private repos).
 * Guest / other profile → public only (private repos stay empty by design).
 */
export function getGithubRepoCommitSparklineQueryOptions(
  repo: string,
  username: string,
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
    input: { repo, username },
    staleTime: githubCachePolicy.detail.staleTimeMs,
    gcTime: githubCachePolicy.detail.gcTimeMs,
    meta: persistedMeta
  });
}

export function useGetGithubRepoCommitSparklineQuery(repo: string, username: string) {
  const { user } = useAuth();
  const sessionUsername = sessionUsernameFromUser(user);
  const isPrivate = Boolean(user && sessionUsername === username);
  return useQuery(getGithubRepoCommitSparklineQueryOptions(repo, username, isPrivate));
}

export type GithubRepoCommitSparklineQueryResult = Awaited<
  ReturnType<typeof orpcClient.github.publicGetRepoCommitSparkline>
>;
