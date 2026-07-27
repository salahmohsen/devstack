import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/shared/lib/query-persistence";

export function getGithubRepoRefCommitQueryOptions(
  repo: string,
  ref: string,
  isPrivate = false,
  profileName?: string
) {
  if (isPrivate) {
    return orpcQueryClient.github.privateGetRefCommit.queryOptions({
      input: { ref, repo },
      staleTime: githubCachePolicy.detail.staleTimeMs,
      gcTime: githubCachePolicy.detail.gcTimeMs,
      meta: persistedMeta
    });
  }
  return orpcQueryClient.github.publicGetRefCommit.queryOptions({
    input: { ref, repo, profileName },
    staleTime: githubCachePolicy.detail.staleTimeMs,
    gcTime: githubCachePolicy.detail.gcTimeMs,
    meta: persistedMeta
  });
}
