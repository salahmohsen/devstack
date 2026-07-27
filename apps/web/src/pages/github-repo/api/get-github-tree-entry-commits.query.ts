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
  profileName: string
) {
  const { user, isPending } = useAuth();
  const sessionProfileName =
    typeof (user as { profileName?: string } | null)?.profileName === "string"
      ? (user as { profileName: string }).profileName
      : null;
  const isPrivate = Boolean(user && !isPending && sessionProfileName === profileName);

  const queryOptions = (
    isPrivate
      ? orpcQueryClient.github.privateGetTreeEntryCommits
      : orpcQueryClient.github.publicGetTreeEntryCommits
  ).queryOptions({
    input: isPrivate
      ? { dirPath, entries, ref, repo }
      : { dirPath, entries, ref, repo, profileName },
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
