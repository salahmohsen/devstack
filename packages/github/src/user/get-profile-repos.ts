import { type OrpcContext } from "@tsu-stack/api/lib/context/types";

import { getGitHubResourceLocalFirst } from "#@/infrastructure/cache/get-github-resource-local-first";
import { githubCachePolicy } from "#@/infrastructure/cache/github-cache-policy";
import { githubRevalidationSignalKeys } from "#@/infrastructure/cache/github-revalidation";
import {
  createGitHubOctokit,
  createGitHubResponseMetadata,
  getErrorStatusCode
} from "#@/infrastructure/octokit/client";
import {
  buildGitHubConditionalHeaders,
  setRepoLoggerLocalFirstOutcome,
  setRepoLoggerOutcome
} from "#@/repo/shared.utils";
import { resolvePublicGitHubSource } from "#@/shared/public-github-source";
import { type GitHubUserRepoSummary } from "#@/types";

export async function getProfileRepos(context?: OrpcContext): Promise<GitHubUserRepoSummary[]> {
  const source = await resolvePublicGitHubSource();
  if (!source.isConfigured) {
    setRepoLoggerOutcome(context, "github_profile_repos_read_skipped", {
      reason: source.reason
    });

    return [];
  }

  const octokit = createGitHubOctokit(source);
  const signalKey = githubRevalidationSignalKeys.ownerRepos(source.owner);

  try {
    const result = await getGitHubResourceLocalFirst<GitHubUserRepoSummary[]>({
      fetcher: async (conditionals) => {
        const response = await octokit.rest.repos.listForUser({
          headers: {
            ...buildGitHubConditionalHeaders(conditionals)
          },
          per_page: 100,
          sort: "updated",
          type: "owner",
          username: source.owner
        });

        const repos: GitHubUserRepoSummary[] = response.data.map((repo) => {
          return {
            createdAt: repo.created_at ?? repo.updated_at ?? new Date(0).toISOString(),
            defaultBranch: repo.default_branch ?? "main",
            description: repo.description ?? null,
            forkCount: repo.forks_count ?? 0,
            fullName: repo.full_name ?? `${repo.owner?.login ?? source.owner}/${repo.name}`,
            id: repo.id,
            isFork: repo.fork,
            isPrivate: repo.private,
            language: repo.language ?? null,
            languageColor: null,
            name: repo.name,
            owner: repo.owner?.login ?? source.owner,
            pushedAt: repo.pushed_at ?? null,
            stars: repo.stargazers_count ?? 0,
            updatedAt: repo.updated_at ?? repo.created_at ?? new Date(0).toISOString(),
            url: repo.html_url,
            visibility:
              repo.visibility === "internal" ? "internal" : repo.private ? "private" : "public"
          };
        });

        return {
          data: repos,
          kind: "success",
          metadata: createGitHubResponseMetadata(response.status, response.headers)
        };
      },
      freshForMs: githubCachePolicy.reposList.staleTimeMs,
      namespaceKeys: [signalKey],
      owner: source.owner,
      params: { username: source.owner },
      resource: "user.profileRepos.v2",
      runtime: context?.github,
      signalKeys: [signalKey]
    });

    setRepoLoggerLocalFirstOutcome(context, "github_profile_repos_read_completed", result.meta, {
      repoCount: result.data.length
    });

    return result.data;
  } catch (error) {
    if (getErrorStatusCode(error) === 404) {
      setRepoLoggerOutcome(context, "github_profile_repos_read_not_found");

      return [];
    }

    throw error;
  }
}
