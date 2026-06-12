import { useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { persistedMeta } from "@/lib/github.query";

export const githubRepoRefCommitQueryKeys = {
  byRef(owner: string, repo: string, ref: string) {
    return orpc.public.github.getRefCommit.queryOptions({
      input: { owner, ref, repo }
    }).queryKey;
  }
};

export function getGithubRepoRefCommitQueryOptions(owner: string, repo: string, ref: string) {
  return orpc.public.github.getRefCommit.queryOptions({
    input: { owner, ref, repo },
    meta: persistedMeta
  });
}

export function useGetGithubRepoRefCommitQuery(owner: string, repo: string, ref: string) {
  return useQuery(getGithubRepoRefCommitQueryOptions(owner, repo, ref));
}

export type GithubRepoRefCommitQueryResult = Awaited<
  ReturnType<typeof client.public.github.getRefCommit>
>;
