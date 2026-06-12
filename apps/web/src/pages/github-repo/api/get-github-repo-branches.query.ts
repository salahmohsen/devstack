import { useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { persistedMeta } from "@/lib/github.query";

export const githubRepoBranchesQueryKeys = {
  byRepo(owner: string, repo: string) {
    return orpc.public.github.getRepoBranches.queryOptions({
      input: { owner, repo }
    }).queryKey;
  }
};

export function getGithubRepoBranchesQueryOptions(owner: string, repo: string) {
  return orpc.public.github.getRepoBranches.queryOptions({
    input: { owner, repo },
    meta: persistedMeta
  });
}

export function useGetGithubRepoBranchesQuery(owner: string, repo: string) {
  return useQuery(getGithubRepoBranchesQueryOptions(owner, repo));
}

export type GithubRepoBranchesQueryResult = Awaited<
  ReturnType<typeof client.public.github.getRepoBranches>
>;
