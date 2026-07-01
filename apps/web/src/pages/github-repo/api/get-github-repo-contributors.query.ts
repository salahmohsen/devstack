import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/shared/lib/query-persistence";

export type GitHubQueryScope = {
  userId: string;
};

export function githubRepoContributorsQueryOptions(
  _scope: GitHubQueryScope,
  input: { owner: string; repo: string },
  isPrivate = false
) {
  return (
    isPrivate
      ? orpcQueryClient.github.privateGetRepoContributors
      : orpcQueryClient.github.publicGetRepoContributors
  ).queryOptions({
    input: { repo: `${input.owner}/${input.repo}` },
    staleTime: githubCachePolicy.repoMeta.staleTimeMs,
    gcTime: githubCachePolicy.repoMeta.gcTimeMs,
    meta: persistedMeta
  });
}

export type GithubRepoContributorsQueryResult = Awaited<
  ReturnType<typeof orpcClient.github.publicGetRepoContributors>
>;
