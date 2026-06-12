import { useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { persistedMeta } from "@/lib/github.query";

export const githubRepoCommitSparklineQueryKeys = {
  byRepo(owner: string, repo: string) {
    return orpc.public.github.getRepoCommitSparkline.queryOptions({
      input: { owner, repo }
    }).queryKey;
  }
};

export function getGithubRepoCommitSparklineQueryOptions(owner: string, repo: string) {
  return orpc.public.github.getRepoCommitSparkline.queryOptions({
    input: { owner, repo },
    meta: persistedMeta
  });
}

export function useGetGithubRepoCommitSparklineQuery(owner: string, repo: string) {
  return useQuery(getGithubRepoCommitSparklineQueryOptions(owner, repo));
}

export type GithubRepoCommitSparklineQueryResult = Awaited<
  ReturnType<typeof client.public.github.getRepoCommitSparkline>
>;
