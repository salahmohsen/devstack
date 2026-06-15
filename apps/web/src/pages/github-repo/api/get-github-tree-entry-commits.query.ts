import { useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/lib/github.query";

export const githubTreeEntryCommitsQueryKeys = {
  byTree(repo: string, ref: string, dirPath: string, entries: string[]) {
    return orpc.public.github.getTreeEntryCommits.queryOptions({
      input: { dirPath, entries, ref, repo }
    }).queryKey;
  }
};

export function getGithubTreeEntryCommitsQueryOptions(
  repo: string,
  ref: string,
  dirPath: string,
  entries: string[]
) {
  return orpc.public.github.getTreeEntryCommits.queryOptions({
    input: { dirPath, entries, ref, repo },
    staleTime: githubCachePolicy.detail.staleTimeMs,
    gcTime: githubCachePolicy.detail.gcTimeMs,
    meta: persistedMeta
  });
}

export function useGetGithubTreeEntryCommitsQuery(
  repo: string,
  ref: string,
  dirPath: string,
  entries: string[]
) {
  return useQuery(getGithubTreeEntryCommitsQueryOptions(repo, ref, dirPath, entries));
}

export type GithubTreeEntryCommitsQueryResult = Awaited<
  ReturnType<typeof client.public.github.getTreeEntryCommits>
>;
