import { queryOptions } from "@tanstack/react-query";

import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type GitHubUserRepoSummary } from "@tsu-stack/github/types";

import { persistedMeta } from "@/shared/lib/query-persistence";

import { buildReposHubResult, type ReposHubInput } from "@/pages/github-repos/lib/repos-hub-filter";

export function githubReposHubQueryOptions(owner: string, input: ReposHubInput) {
  return queryOptions({
    queryKey: [
      ...orpc.public.github.getProfileRepos.queryOptions({ input: { username: owner } }).queryKey,
      input
    ] as const,
    queryFn: async () => {
      if (!owner) {
        return buildReposHubResult([], input);
      }

      const { client: runtimeClient } = await import("@tsu-stack/api/client/tanstack-start/orpc");
      const repos = (await runtimeClient.public.github.getProfileRepos({
        username: owner
      })) as GitHubUserRepoSummary[];

      return buildReposHubResult(repos, input);
    },
    meta: persistedMeta
  });
}
