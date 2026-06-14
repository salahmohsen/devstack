import { useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/lib/github.query";

export const githubRepoFileContentQueryKeys = {
  byPath(repo: string, ref: string, path: string) {
    return orpc.public.github.getRepoFileContent.queryOptions({
      input: { path, ref, repo }
    }).queryKey;
  }
};

export function getGithubRepoFileContentQueryOptions(repo: string, ref: string, path: string) {
  return orpc.public.github.getRepoFileContent.queryOptions({
    input: { path, ref, repo },
    staleTime: githubCachePolicy.repoMeta.staleTimeMs,
    gcTime: githubCachePolicy.repoMeta.gcTimeMs,
    meta: persistedMeta
  });
}

export function useGetGithubRepoFileContentQuery(repo: string, ref: string, path: string) {
  return useQuery({
    ...getGithubRepoFileContentQueryOptions(repo, ref, path),
    enabled: path.length > 0
  });
}

export type GithubRepoFileContentQueryResult = Awaited<
  ReturnType<typeof client.public.github.getRepoFileContent>
>;
