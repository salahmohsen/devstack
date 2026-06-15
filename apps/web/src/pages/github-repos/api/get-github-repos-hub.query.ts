import { queryOptions, useQuery } from "@tanstack/react-query";

import { type client } from "@tsu-stack/api/client/tanstack-start/orpc";

import {
  buildReposHubResult,
  type ReposHubInput,
  type UserRepoSummary
} from "@/pages/github-repos/lib/repos-hub-filter";

import { persistedMeta } from "@/lib/github.query";

export type GithubProfileReposQueryResult = Awaited<
  ReturnType<typeof client.public.github.getProfileRepos>
>;

export function githubReposHubQueryOptions(owner: string, input: ReposHubInput) {
  return queryOptions({
    queryKey: ["github", owner, "repos", "hub", input] as const,
    queryFn: async () => {
      if (!owner) {
        return buildReposHubResult([], input);
      }

      const { client: runtimeClient } = await import("@tsu-stack/api/client/tanstack-start/orpc");
      const repos = await runtimeClient.public.github.getProfileRepos({ username: owner });
      const normalizedRepos: UserRepoSummary[] = repos.map((repo) => {
        return {
          ...repo,
          forks: repo.forkCount
        };
      });

      return buildReposHubResult(normalizedRepos, input);
    },
    meta: persistedMeta
  });
}

export function useGithubReposHubQuery(owner: string, input: ReposHubInput) {
  return useQuery(githubReposHubQueryOptions(owner, input));
}
