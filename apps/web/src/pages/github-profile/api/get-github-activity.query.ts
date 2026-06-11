import { useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { persistedMeta } from "@/lib/github.query";

export const githubActivityQueryKeys = {
  byUsername(username: string, page = 1) {
    return orpc.public.github.getUserActivity.queryOptions({
      input: { isOwnProfile: false, page, username }
    }).queryKey;
  }
};

export function getGithubActivityQueryOptions(username: string, page = 1) {
  return orpc.public.github.getUserActivity.queryOptions({
    input: { isOwnProfile: false, page, username },
    meta: persistedMeta
  });
}

export function useGetGithubActivityQuery(username: string, page = 1) {
  return useQuery(getGithubActivityQueryOptions(username, page));
}

export type GithubActivityQueryResult = Awaited<
  ReturnType<typeof client.public.github.getUserActivity>
>;
