import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/shared/lib/query-persistence";

export type GitHubQueryScope = {
  userId: string;
};

export function githubRepoContributorsQueryOptions(
  _scope: GitHubQueryScope,
  input: { owner: string; repo: string; profileName?: string },
  isPrivate = false
) {
  if (isPrivate) {
    return orpcQueryClient.github.privateGetRepoContributors.queryOptions({
      input: { repo: `${input.owner}/${input.repo}` },
      staleTime: githubCachePolicy.repoMeta.staleTimeMs,
      gcTime: githubCachePolicy.repoMeta.gcTimeMs,
      meta: persistedMeta
    });
  }
  return orpcQueryClient.github.publicGetRepoContributors.queryOptions({
    input: { repo: `${input.owner}/${input.repo}`, profileName: input.profileName },
    staleTime: githubCachePolicy.repoMeta.staleTimeMs,
    gcTime: githubCachePolicy.repoMeta.gcTimeMs,
    meta: persistedMeta
  });
}

export type GithubRepoContributorsQueryResult = Awaited<
  ReturnType<typeof orpcClient.github.publicGetRepoContributors>
>;
