import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { type GitHubUserRepoSummary } from "@tsu-stack/github/types";

import { persistedMeta } from "@/shared/lib/query-persistence";

import { buildReposHubResult, type ReposHubInput } from "@/pages/github-repos/lib/repos-hub-filter";

/**
 * Profile-scoped repos hub.
 * - Public: requires `profileName` (or Host custom domain via empty profileName + API Host)
 * - Private: only when viewer is signed in as that same profile
 */
export function githubReposHubQueryOptions(
  input: ReposHubInput,
  isPrivate = false,
  profileName?: string
) {
  if (isPrivate) {
    return {
      ...orpcQueryClient.github.privateGetProfileRepos.queryOptions({ meta: persistedMeta }),
      select: (repos: GitHubUserRepoSummary[]) => buildReposHubResult(repos, input)
    };
  }

  if (!profileName) {
    return {
      queryKey: ["github", "repos-hub", "missing-profile"] as const,
      queryFn: async (): Promise<GitHubUserRepoSummary[]> => [],
      select: (repos: GitHubUserRepoSummary[]) => buildReposHubResult(repos, input),
      enabled: false as const
    };
  }

  return {
    ...orpcQueryClient.github.publicGetProfileRepos.queryOptions({
      input: { profileName },
      meta: persistedMeta
    }),
    select: (repos: GitHubUserRepoSummary[]) => buildReposHubResult(repos, input)
  };
}

export function useGithubReposHubQueryOptions(input: ReposHubInput, profileName: string) {
  const { user } = useAuth();
  const sessionProfileName =
    typeof (user as { profileName?: string } | null)?.profileName === "string"
      ? (user as { profileName: string }).profileName
      : null;
  const isPrivate = Boolean(user && sessionProfileName === profileName);
  return githubReposHubQueryOptions(input, isPrivate, profileName);
}
