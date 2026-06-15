import { useQuery } from "@tanstack/react-query";

import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/shared/lib/query-persistence";

export function getGithubRepoBranchesQueryOptions(repo: string) {
  return orpc.public.github.getRepoBranches.queryOptions({
    input: { repo },
    staleTime: githubCachePolicy.repoMeta.staleTimeMs,
    gcTime: githubCachePolicy.repoMeta.gcTimeMs,
    meta: persistedMeta
  });
}

export function useGetGithubRepoBranchesQuery(repo: string) {
  return useQuery(getGithubRepoBranchesQueryOptions(repo));
}
