import { useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { persistedMeta } from "@/lib/github.query";

export const githubRepoFileContentQueryKeys = {
  byPath(owner: string, repo: string, ref: string, path: string) {
    return orpc.public.github.getRepoFileContent.queryOptions({
      input: { owner, path, ref, repo }
    }).queryKey;
  }
};

export function getGithubRepoFileContentQueryOptions(
  owner: string,
  repo: string,
  ref: string,
  path: string
) {
  return orpc.public.github.getRepoFileContent.queryOptions({
    input: { owner, path, ref, repo },
    meta: persistedMeta
  });
}

export function useGetGithubRepoFileContentQuery(
  owner: string,
  repo: string,
  ref: string,
  path: string
) {
  return useQuery({
    ...getGithubRepoFileContentQueryOptions(owner, repo, ref, path),
    enabled: path.length > 0
  });
}

export type GithubRepoFileContentQueryResult = Awaited<
  ReturnType<typeof client.public.github.getRepoFileContent>
>;
