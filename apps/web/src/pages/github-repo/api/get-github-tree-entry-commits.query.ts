import { useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { persistedMeta } from "@/lib/github.query";

export const githubTreeEntryCommitsQueryKeys = {
  byTree(owner: string, repo: string, ref: string, dirPath: string, entries: string[]) {
    return orpc.public.github.getTreeEntryCommits.queryOptions({
      input: { dirPath, entries, owner, ref, repo }
    }).queryKey;
  }
};

export function getGithubTreeEntryCommitsQueryOptions(
  owner: string,
  repo: string,
  ref: string,
  dirPath: string,
  entries: string[]
) {
  return orpc.public.github.getTreeEntryCommits.queryOptions({
    input: { dirPath, entries, owner, ref, repo },
    meta: persistedMeta
  });
}

export function useGetGithubTreeEntryCommitsQuery(
  owner: string,
  repo: string,
  ref: string,
  dirPath: string,
  entries: string[]
) {
  return useQuery(getGithubTreeEntryCommitsQueryOptions(owner, repo, ref, dirPath, entries));
}

export type GithubTreeEntryCommitsQueryResult = Awaited<
  ReturnType<typeof client.public.github.getTreeEntryCommits>
>;
