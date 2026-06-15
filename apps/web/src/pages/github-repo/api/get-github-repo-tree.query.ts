import { useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/lib/github.query";

export const githubRepoTreeQueryKeys = {
  byPath(repo: string, ref: string, path = "") {
    return orpc.public.github.getRepoTree.queryOptions({
      input: { path, ref, repo }
    }).queryKey;
  }
};

export function getGithubRepoTreeQueryOptions(repo: string, ref: string, path = "") {
  return orpc.public.github.getRepoTree.queryOptions({
    input: { path, ref, repo },
    staleTime: githubCachePolicy.detail.staleTimeMs,
    gcTime: githubCachePolicy.detail.gcTimeMs,
    meta: persistedMeta
  });
}

export function useGetGithubRepoTreeQuery(repo: string, ref: string, path = "") {
  return useQuery(getGithubRepoTreeQueryOptions(repo, ref, path));
}

export type GithubRepoTreeQueryResult = Awaited<
  ReturnType<typeof client.public.github.getRepoTree>
>;
