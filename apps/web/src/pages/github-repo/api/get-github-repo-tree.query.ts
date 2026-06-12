import { useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { persistedMeta } from "@/lib/github.query";

export const githubRepoTreeQueryKeys = {
  byPath(owner: string, repo: string, ref: string, path = "") {
    return orpc.public.github.getRepoTree.queryOptions({
      input: { owner, path, ref, repo }
    }).queryKey;
  }
};

export function getGithubRepoTreeQueryOptions(owner: string, repo: string, ref: string, path = "") {
  return orpc.public.github.getRepoTree.queryOptions({
    input: { owner, path, ref, repo },
    meta: persistedMeta
  });
}

export function useGetGithubRepoTreeQuery(owner: string, repo: string, ref: string, path = "") {
  return useQuery(getGithubRepoTreeQueryOptions(owner, repo, ref, path));
}

export type GithubRepoTreeQueryResult = Awaited<
  ReturnType<typeof client.public.github.getRepoTree>
>;
