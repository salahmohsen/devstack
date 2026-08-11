import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { type GitHubUserRepoSummary } from "@tsu-stack/github/types";

import { persistedMeta } from "@/shared/lib/query-persistence";

import { buildReposHubResult, type ReposHubInput } from "@/pages/github-repos/lib/repos-hub-filter";

/**
 * Profile-scoped repos hub.
 * - Public: requires `username` (or Host custom domain via empty username + API Host)
 * - Private: only when viewer is signed in as that same profile
 */
export function githubReposHubQueryOptions(
  input: ReposHubInput,
  isPrivate = false,
  username?: string
) {
  if (isPrivate) {
    return {
      ...orpcQueryClient.github.privateGetProfileRepos.queryOptions({ meta: persistedMeta }),
      select: (repos: GitHubUserRepoSummary[]) => buildReposHubResult(repos, input)
    };
  }

  if (!username) {
    return {
      queryKey: ["github", "repos-hub", "missing-profile"] as const,
      queryFn: async (): Promise<GitHubUserRepoSummary[]> => [],
      select: (repos: GitHubUserRepoSummary[]) => buildReposHubResult(repos, input),
      enabled: false as const
    };
  }

  return {
    ...orpcQueryClient.github.publicGetProfileRepos.queryOptions({
      input: { username },
      meta: persistedMeta
    }),
    select: (repos: GitHubUserRepoSummary[]) => buildReposHubResult(repos, input)
  };
}

export function useGithubReposHubQueryOptions(input: ReposHubInput, username: string) {
  const { user } = useAuth();
  const sessionUsername =
    typeof (user as { username?: string } | null)?.username === "string"
      ? (user as { username: string }).username
      : null;
  const isPrivate = Boolean(user && sessionUsername === username);
  return githubReposHubQueryOptions(input, isPrivate, username);
}
