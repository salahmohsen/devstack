import { useQuery } from "@tanstack/react-query";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { githubCachePolicy } from "@tsu-stack/github/cache/github-cache-policy";

import { persistedMeta } from "@/shared/lib/query-persistence";

export function useGetGithubTreeEntryCommitsQuery(
  repo: string,
  ref: string,
  dirPath: string,
  entries: string[],
  username: string
) {
  const { user, isPending } = useAuth();
  const sessionUsername =
    typeof (user as { username?: string } | null)?.username === "string"
      ? (user as { username: string }).username
      : null;
  const isPrivate = Boolean(user && !isPending && sessionUsername === username);

  const queryOptions = (
    isPrivate
      ? orpcQueryClient.github.privateGetTreeEntryCommits
      : orpcQueryClient.github.publicGetTreeEntryCommits
  ).queryOptions({
    input: isPrivate ? { dirPath, entries, ref, repo } : { dirPath, entries, ref, repo, username },
    staleTime: githubCachePolicy.detail.staleTimeMs,
    gcTime: githubCachePolicy.detail.gcTimeMs,
    retry: false,
    meta: persistedMeta
  });

  return useQuery(queryOptions);
}

export type GithubTreeEntryCommitsQueryResult = Awaited<
  ReturnType<typeof orpcClient.github.publicGetTreeEntryCommits>
>;
