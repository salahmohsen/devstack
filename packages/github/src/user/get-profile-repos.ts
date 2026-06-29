import { type OrpcContext } from "@tsu-stack/api/lib/context/types";

import { getGitHubResourceLocalFirst } from "#@/infrastructure/cache/get-github-resource-local-first";
import { githubCachePolicy } from "#@/infrastructure/cache/github-cache-policy";
import { githubRevalidationSignalKeys } from "#@/infrastructure/cache/github-revalidation";
import {
  type GitHubClient,
  createGitHubResponseMetadata,
  getErrorStatusCode
} from "#@/infrastructure/octokit/client";
import {
  buildGitHubConditionalHeaders,
  setRepoLoggerLocalFirstOutcome,
  setRepoLoggerOutcome
} from "#@/repo/shared.utils";
import { type GitHubUserRepoSummary } from "#@/types";

type FetchOptions = {
  context: OrpcContext;
  octokit: GitHubClient;
  /**
   * Which Octokit endpoint to use. `listForUser` hits
   * `GET /users/{username}/repos` (public repos only, no auth needed).
   * `listForAuthenticatedUser` hits `GET /user/repos` (all repos the
   * authenticated user can see, including private — requires `repo`
   * scope).
   */
  endpoint: "listForUser" | "listForAuthenticatedUser";
  /**
   * Cache key suffix that distinguishes a public read from a private
   * read. The cache is keyed on `${owner}::${resource}::${params}`
   * and both endpoints share owner/params, so without this suffix a
   * prior public call would poison the private cache (and vice
   * versa) until `reposList.staleTimeMs` expired. The private path
   * needs its own slot because the auth scope of the request is
   * part of the data's identity — a public-only payload and a
   * public+private payload for the same owner are different
   * resources.
   */
  resourceSuffix: "public" | "private";
};

async function _fetchProfileRepos({
  context,
  octokit,
  endpoint,
  resourceSuffix
}: FetchOptions): Promise<GitHubUserRepoSummary[]> {
  const source = context.github.source;
  if (!source.isConfigured) {
    setRepoLoggerOutcome(context, "github_profile_repos_read_skipped", {
      reason: source.reason
    });

    return [];
  }

  const signalKey = githubRevalidationSignalKeys.ownerRepos(source.owner);

  try {
    const result = await getGitHubResourceLocalFirst<GitHubUserRepoSummary[]>({
      fetcher: async (conditionals) => {
        const baseParams = {
          headers: {
            ...buildGitHubConditionalHeaders(conditionals)
          },
          per_page: 100,
          sort: "updated" as const,
          type: "owner" as const
        };

        const response =
          endpoint === "listForAuthenticatedUser"
            ? // `GET /user/repos` — includes private repos when the
              // access token has the `repo` scope. GitHub forbids
              // combining `type` with `affiliation` or `visibility` on
              // this endpoint, so we strip `type` and rely on
              // `affiliation: "owner"` to filter to repos the caller
              // owns (including private org/team-owned repos they
              // administer).
              await octokit.rest.repos.listForAuthenticatedUser({
                headers: baseParams.headers,
                per_page: baseParams.per_page,
                sort: baseParams.sort,
                affiliation: "owner"
              })
            : // `GET /users/{username}/repos` — public repos only, no auth
              // required. Works for any user. `type` is the only way to
              // filter owner-vs-member repos on this endpoint.
              await octokit.rest.repos.listForUser({
                ...baseParams,
                username: source.owner
              });

        const repos: GitHubUserRepoSummary[] = response.data.map((repo) => {
          return {
            createdAt: repo.created_at ?? repo.updated_at ?? new Date(0).toISOString(),
            defaultBranch: repo.default_branch ?? "main",
            description: repo.description ?? null,
            forks: repo.forks_count ?? 0,
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
      resource: `user.profileRepos.v3.${resourceSuffix}`,
      runtime: context.github.binding,
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

export function getProfileRepos(context: OrpcContext): Promise<GitHubUserRepoSummary[]> {
  // Public path — no auth, no private repos. Uses `GET /users/{username}/repos`.
  return _fetchProfileRepos({
    context,
    octokit: context.github.publicOctokit,
    endpoint: "listForUser",
    resourceSuffix: "public"
  });
}

export function getPrivateProfileRepos(context: OrpcContext): Promise<GitHubUserRepoSummary[]> {
  // Private path — uses the owner's token with `repo` scope to hit
  // `GET /user/repos` (includes private repos). If the token is
  // missing or lacks the scope, GitHub returns only public repos
  // here too, but the endpoint itself supports private.
  return _fetchProfileRepos({
    context,
    octokit: context.github.privateOctokit,
    endpoint: "listForAuthenticatedUser",
    resourceSuffix: "private"
  });
}
