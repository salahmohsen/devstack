import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { type GitHubUserRepoSummary } from "@tsu-stack/github/types";

import { persistedMeta } from "@/shared/lib/query-persistence";

import { buildReposHubResult, type ReposHubInput } from "@/pages/github-repos/lib/repos-hub-filter";

/**
 * Repos hub is **session-private only** in multi-user mode.
 * Public repo browsing is not global — use a profile-scoped surface later if needed.
 */
export function githubReposHubQueryOptions(input: ReposHubInput, isPrivate = false) {
  if (!isPrivate) {
    return {
      queryKey: ["github", "repos-hub", "unauthenticated"] as const,
      queryFn: async (): Promise<GitHubUserRepoSummary[]> => [],
      select: (repos: GitHubUserRepoSummary[]) => buildReposHubResult(repos, input),
      enabled: false as const
    };
  }

  return {
    ...orpcQueryClient.github.privateGetProfileRepos.queryOptions({ meta: persistedMeta }),
    select: (repos: GitHubUserRepoSummary[]) => buildReposHubResult(repos, input)
  };
}

export function useGithubReposHubQueryOptions(input: ReposHubInput) {
  const { user } = useAuth();
  return githubReposHubQueryOptions(input, !!user);
}
