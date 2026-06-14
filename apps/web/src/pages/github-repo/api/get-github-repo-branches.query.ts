import { useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/lib/github.query";

export const githubRepoBranchesQueryKeys = {
  byRepo(repo: string) {
    return orpc.public.github.getRepoBranches.queryOptions({
      input: { repo }
    }).queryKey;
  }
};

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

export type GithubRepoBranchesQueryResult = Awaited<
  ReturnType<typeof client.public.github.getRepoBranches>
>;
