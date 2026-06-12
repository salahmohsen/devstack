import { useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { persistedMeta } from "@/lib/github.query";

export const githubRepoBranchComparisonQueryKeys = {
  byBranches(owner: string, repo: string, base: string, head: string) {
    return orpc.public.github.getRepoBranchComparison.queryOptions({
      input: { base, head, owner, repo }
    }).queryKey;
  }
};

export function getGithubRepoBranchComparisonQueryOptions(
  owner: string,
  repo: string,
  base: string,
  head: string
) {
  return orpc.public.github.getRepoBranchComparison.queryOptions({
    input: { base, head, owner, repo },
    meta: persistedMeta
  });
}

export function useGetGithubRepoBranchComparisonQuery(
  owner: string,
  repo: string,
  base: string,
  head: string
) {
  return useQuery({
    ...getGithubRepoBranchComparisonQueryOptions(owner, repo, base, head),
    enabled: base !== head
  });
}

export type GithubRepoBranchComparisonQueryResult = Awaited<
  ReturnType<typeof client.public.github.getRepoBranchComparison>
>;
