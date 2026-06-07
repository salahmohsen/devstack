import { getGitHubResourceLocalFirst } from "#@/infrastructure/cache/get-github-resource-local-first";
import { githubCachePolicy } from "#@/infrastructure/cache/github-cache-policy";
import { githubRevalidationSignalKeys } from "#@/infrastructure/cache/github-revalidation";
import {
  createGitHubOctokit,
  createGitHubResponseMetadata,
  getErrorStatusCode
} from "#@/infrastructure/octokit/client";
import { type GitHubRuntimeBindings } from "#@/runtime/bindings";
import { resolvePublicGitHubSource } from "#@/shared/public-github-source";
import { type GitHubUserRepoSummary } from "#@/types";

export async function getProfileRepos(
  username: string,
  runtime?: GitHubRuntimeBindings
): Promise<GitHubUserRepoSummary[]> {
  const source = await resolvePublicGitHubSource();
  if (!source.isConfigured) {
    return [];
  }

  const octokit = createGitHubOctokit(source);
  const signalKey = githubRevalidationSignalKeys.ownerRepos(username);

  try {
    const result = await getGitHubResourceLocalFirst<GitHubUserRepoSummary[]>({
      fetcher: async (conditionals) => {
        const response = await octokit.rest.repos.listForUser({
          headers: {
            ...buildConditionalHeaders(conditionals)
          },
          per_page: 100,
          sort: "updated",
          type: "owner",
          username
        });

        const repos: GitHubUserRepoSummary[] = response.data.map((repo) => {
          return {
            defaultBranch: repo.default_branch ?? "main",
            description: repo.description ?? null,
            forkCount: repo.forks_count ?? 0,
            fullName: repo.full_name ?? `${repo.owner?.login ?? username}/${repo.name}`,
            id: repo.id,
            isFork: repo.fork,
            isPrivate: repo.private,
            language: repo.language ?? null,
            languageColor: null,
            name: repo.name,
            owner: repo.owner?.login ?? username,
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
      params: { username },
      resource: "user.profileRepos.v1",
      runtime,
      signalKeys: [signalKey]
    });

    return result.data;
  } catch (error) {
    if (getErrorStatusCode(error) === 404) {
      return [];
    }

    throw error;
  }
}

function buildConditionalHeaders(conditionals: {
  etag?: string | null;
  lastModified?: string | null;
}) {
  return {
    ...(conditionals.etag ? { "if-none-match": conditionals.etag } : {}),
    ...(conditionals.lastModified ? { "if-modified-since": conditionals.lastModified } : {})
  };
}
