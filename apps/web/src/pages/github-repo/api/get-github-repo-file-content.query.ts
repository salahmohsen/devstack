import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/shared/lib/query-persistence";

export function getGithubRepoFileContentQueryOptions(
  repo: string,
  ref: string,
  path: string,
  isPrivate = false
) {
  return (
    isPrivate
      ? orpcQueryClient.github.privateGetRepoFileContent
      : orpcQueryClient.github.publicGetRepoFileContent
  ).queryOptions({
    input: { path, ref, repo },
    staleTime: githubCachePolicy.repoMeta.staleTimeMs,
    gcTime: githubCachePolicy.repoMeta.gcTimeMs,
    meta: persistedMeta
  });
}
