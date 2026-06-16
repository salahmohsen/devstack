import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type GitHubUserRepoSummary } from "@tsu-stack/github/types";

import { persistedMeta } from "@/shared/lib/query-persistence";

import { buildReposHubResult, type ReposHubInput } from "@/pages/github-repos/lib/repos-hub-filter";

export function githubReposHubQueryOptions(input: ReposHubInput) {
  return {
    ...orpc.public.github.getProfileRepos.queryOptions({ meta: persistedMeta }),
    select: (repos: GitHubUserRepoSummary[]) => buildReposHubResult(repos, input)
  };
}
