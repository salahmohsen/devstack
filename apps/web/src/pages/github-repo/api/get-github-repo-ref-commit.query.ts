import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/shared/lib/query-persistence";

export function getGithubRepoRefCommitQueryOptions(repo: string, ref: string, isPrivate = false) {
  return (
    isPrivate
      ? orpcQueryClient.github.privateGetRefCommit
      : orpcQueryClient.github.publicGetRefCommit
  ).queryOptions({
    input: { ref, repo },
    staleTime: githubCachePolicy.detail.staleTimeMs,
    gcTime: githubCachePolicy.detail.gcTimeMs,
    meta: persistedMeta
  });
}
