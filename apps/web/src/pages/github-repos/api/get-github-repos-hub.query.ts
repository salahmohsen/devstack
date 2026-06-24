import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { type GitHubUserRepoSummary } from "@tsu-stack/github/types";

import { persistedMeta } from "@/shared/lib/query-persistence";

import { buildReposHubResult, type ReposHubInput } from "@/pages/github-repos/lib/repos-hub-filter";

export function githubReposHubQueryOptions(input: ReposHubInput, isPrivate = false) {
  return {
    ...(isPrivate
      ? orpc.github.privateGetProfileRepos
      : orpc.github.publicGetProfileRepos
    ).queryOptions({ meta: persistedMeta }),
    select: (repos: GitHubUserRepoSummary[]) => buildReposHubResult(repos, input)
  };
}

export function useGithubReposHubQueryOptions(input: ReposHubInput) {
  const { user } = useAuth();
  return githubReposHubQueryOptions(input, !!user);
}
