import { useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { persistedMeta } from "@/lib/github.query";

export const githubProfileReposQueryKeys = {
  byUsername(username: string) {
    return orpc.public.github.getProfileRepos.queryOptions({
      input: { username }
    }).queryKey;
  }
};

export function getGithubProfileReposQueryOptions(username: string) {
  return orpc.public.github.getProfileRepos.queryOptions({
    input: { username },
    meta: persistedMeta
  });
}

export function useGetGithubProfileReposQuery(username: string, enabled = true) {
  return useQuery({
    ...getGithubProfileReposQueryOptions(username),
    enabled
  });
}

export type GithubProfileReposQueryResult = Awaited<
  ReturnType<typeof client.public.github.getProfileRepos>
>;
