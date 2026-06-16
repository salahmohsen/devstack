import { useQuery } from "@tanstack/react-query";

import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/shared/lib/query-persistence";

export function getGithubProfileReposQueryOptions() {
  return orpc.public.github.getProfileRepos.queryOptions({
    meta: persistedMeta,
    staleTime: githubCachePolicy.reposList.staleTimeMs,
    gcTime: githubCachePolicy.reposList.gcTimeMs
  });
}

export function useGetGithubProfileReposQuery(enabled = true) {
  return useQuery({
    ...getGithubProfileReposQueryOptions(),
    enabled
  });
}
