import { type OrpcContext } from "@tsu-stack/core";

import { getCachedGitHubRequest } from "#@/infrastructure/cache/get-github-resource-local-first";
import { githubCachePolicy } from "#@/infrastructure/cache/github-cache-policy";
import { githubRevalidationSignalKeys } from "#@/infrastructure/cache/github-revalidation";
import {
  type GitHubClient,
  createGitHubResponseMetadata,
  isGitHubNotFoundError
} from "#@/infrastructure/octokit/client";
import {
  buildRepoPullRepositoryRef,
  mapRepoPullSummary
} from "#@/repo/repo-pulls/repo-pulls.utils";
import {
  buildGitHubConditionalHeaders,
  setRepoLoggerContext,
  setRepoLoggerLocalFirstOutcome,
  setRepoLoggerOutcome
} from "#@/repo/shared.utils";
import { type GitHubPullSummary } from "#@/schemas";
import {
  type RepoAccessSurface,
  assertRepoVisibleOnPublicSurface,
  repoCacheResource,
  resolveRepoOwnerName
} from "#@/shared/public-repo-access";

const REPO_PULLS_PER_PAGE = 5;
const REPO_PULLS_MAX_PER_PAGE = 100;

function clampPerPage(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return REPO_PULLS_PER_PAGE;
  }
  return Math.min(Math.max(Math.trunc(value ?? REPO_PULLS_PER_PAGE), 1), REPO_PULLS_MAX_PER_PAGE);
}

function clampPage(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.max(Math.trunc(value ?? 1), 1);
}

async function _fetchRepoPulls(
  input: {
    repo: string;
    state?: "open" | "closed" | "all";
    perPage?: number;
    page?: number;
    sort?: "created" | "long-running" | "popularity" | "updated";
    direction?: "asc" | "desc";
  },
  context: OrpcContext,
  octokit: GitHubClient,
  surface: RepoAccessSurface
): Promise<GitHubPullSummary[]> {
  setRepoLoggerContext(context, "getRepoPulls", {
    repo: input.repo
  });

  const source = context.github.source;
  if (!source.isConfigured) {
    setRepoLoggerOutcome(context, "github_repo_pulls_read_skipped", {
      reason: source.reason
    });
    return [];
  }

  try {
    const { owner: privacyOwner, name: privacyRepo } = resolveRepoOwnerName(
      input.repo,
      source.owner
    );
    await assertRepoVisibleOnPublicSurface(octokit, privacyOwner, privacyRepo, surface);
  } catch (error) {
    if (isGitHubNotFoundError(error)) {
      setRepoLoggerOutcome(context, "github_repo_public_access_denied_or_missing");
      return [];
    }
    throw error;
  }

  const owner = source.owner;
  const repo = input.repo;
  const signalKey = githubRevalidationSignalKeys.repoMeta({ owner, repo });
  const perPage = clampPerPage(input.perPage);
  const page = clampPage(input.page);
  const state = input.state ?? "open";
  const sort = input.sort ?? "updated";
  const direction = input.direction ?? "desc";

  try {
    const result = await getCachedGitHubRequest<GitHubPullSummary[]>({
      fetcher: async (conditionals) => {
        const response = await octokit.rest.pulls.list({
          headers: buildGitHubConditionalHeaders(conditionals),
          owner,
          repo,
          state,
          sort,
          direction,
          page,
          per_page: perPage
        });

        return {
          data: response.data.map((pull) =>
            mapRepoPullSummary(pull, buildRepoPullRepositoryRef(owner, repo))
          ),
          kind: "success",
          metadata: createGitHubResponseMetadata(response.status, response.headers)
        };
      },
      freshForMs: githubCachePolicy.list.staleTimeMs,
      namespaceKeys: [signalKey],
      owner,
      params: input,
      resource: repoCacheResource("repo.pulls.list.v2", surface),
      runtime: context.github.binding,
      signalKeys: [signalKey]
    });

    setRepoLoggerLocalFirstOutcome(context, "github_repo_pulls_read_completed", result.meta, {
      pullCount: result.data.length
    });

    return result.data;
  } catch (error) {
    if (isGitHubNotFoundError(error)) {
      setRepoLoggerOutcome(context, "github_repo_pulls_read_not_found");
      return [];
    }

    throw error;
  }
}

export function getRepoPulls(
  input: {
    repo: string;
    state?: "open" | "closed" | "all";
    perPage?: number;
    page?: number;
    sort?: "created" | "long-running" | "popularity" | "updated";
    direction?: "asc" | "desc";
  },
  context: OrpcContext
): Promise<GitHubPullSummary[]> {
  return _fetchRepoPulls(input, context, context.github.publicOctokit, "public");
}

export function getPrivateRepoPulls(
  input: {
    repo: string;
    state?: "open" | "closed" | "all";
    perPage?: number;
    page?: number;
    sort?: "created" | "long-running" | "popularity" | "updated";
    direction?: "asc" | "desc";
  },
  context: OrpcContext
): Promise<GitHubPullSummary[]> {
  return _fetchRepoPulls(input, context, context.github.privateOctokit, "private");
}
