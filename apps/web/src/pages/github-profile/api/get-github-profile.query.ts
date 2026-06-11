import { useQuery } from "@tanstack/react-query";

import { type client, orpc } from "@tsu-stack/api/client/tanstack-start/orpc";

import { persistedMeta } from "@/lib/github.query";

export const githubProfileQueryKeys = {
  byUsername(username: string) {
    return orpc.public.github.getUserProfile.queryOptions({
      input: { username }
    }).queryKey;
  }
};

export function getGithubProfileQueryOptions(username: string) {
  return orpc.public.github.getUserProfile.queryOptions({
    input: { username },
    meta: persistedMeta
  });
}

export function useGetGithubProfileQuery(username: string) {
  return useQuery(getGithubProfileQueryOptions(username));
}

export type GithubProfileQueryResult = Awaited<
  ReturnType<typeof client.public.github.getUserProfile>
>;
