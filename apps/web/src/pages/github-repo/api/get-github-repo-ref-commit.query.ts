import { useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/lib/github.query";

export const githubRepoRefCommitQueryKeys = {
  byRef(repo: string, ref: string) {
    return orpc.public.github.getRefCommit.queryOptions({
      input: { ref, repo }
    }).queryKey;
  }
};

export function getGithubRepoRefCommitQueryOptions(repo: string, ref: string) {
  return orpc.public.github.getRefCommit.queryOptions({
    input: { ref, repo },
    staleTime: githubCachePolicy.detail.staleTimeMs,
    gcTime: githubCachePolicy.detail.gcTimeMs,
    meta: persistedMeta
  });
}

export function useGetGithubRepoRefCommitQuery(repo: string, ref: string) {
  return useQuery(getGithubRepoRefCommitQueryOptions(repo, ref));
}

export type GithubRepoRefCommitQueryResult = Awaited<
  ReturnType<typeof client.public.github.getRefCommit>
>;
