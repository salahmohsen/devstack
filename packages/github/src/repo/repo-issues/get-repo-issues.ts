import { type OrpcContext } from "@tsu-stack/core";

import { getCachedGitHubRequest } from "#@/infrastructure/cache/get-github-resource-local-first";
import { githubCachePolicy } from "#@/infrastructure/cache/github-cache-policy";
import { githubRevalidationSignalKeys } from "#@/infrastructure/cache/github-revalidation";
import {
  type GitHubClient,
  createGitHubResponseMetadata,
  getErrorStatusCode
} from "#@/infrastructure/octokit/client";
import {
  buildRepoIssueRepositoryRef,
  mapRepoIssueSummary
} from "#@/repo/repo-issues/repo-issues.utils";
import {
  buildGitHubConditionalHeaders,
  setRepoLoggerContext,
  setRepoLoggerLocalFirstOutcome,
  setRepoLoggerOutcome
} from "#@/repo/shared.utils";
import { type GitHubIssueSummary } from "#@/schemas";

const REPO_ISSUES_PER_PAGE = 5;
const REPO_ISSUES_MAX_PER_PAGE = 100;

function clampPerPage(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return REPO_ISSUES_PER_PAGE;
  }
  return Math.min(Math.max(Math.trunc(value ?? REPO_ISSUES_PER_PAGE), 1), REPO_ISSUES_MAX_PER_PAGE);
}

function clampPage(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.max(Math.trunc(value ?? 1), 1);
}

async function _fetchRepoIssues(
  input: {
    repo: string;
    state?: "open" | "closed" | "all";
    perPage?: number;
    page?: number;
    sort?: "comments" | "created" | "updated";
    direction?: "asc" | "desc";
  },
  context: OrpcContext,
  octokit: GitHubClient
): Promise<GitHubIssueSummary[]> {
  setRepoLoggerContext(context, "getRepoIssues", {
    repo: input.repo
  });

  const source = context.github.source;
  if (!source.isConfigured) {
    setRepoLoggerOutcome(context, "github_repo_issues_read_skipped", {
      reason: source.reason
    });
    return [];
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
    const result = await getCachedGitHubRequest<GitHubIssueSummary[]>({
      fetcher: async (conditionals) => {
        const response = await octokit.rest.issues.listForRepo({
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
          data: response.data
            .filter((issue) => !issue.pull_request)
            .map((issue) => mapRepoIssueSummary(issue, buildRepoIssueRepositoryRef(owner, repo))),
          kind: "success",
          metadata: createGitHubResponseMetadata(response.status, response.headers)
        };
      },
      freshForMs: githubCachePolicy.list.staleTimeMs,
      namespaceKeys: [signalKey],
      owner,
      params: input,
      resource: "repo.issues.list.v1",
      runtime: context.github.binding,
      signalKeys: [signalKey]
    });

    setRepoLoggerLocalFirstOutcome(context, "github_repo_issues_read_completed", result.meta, {
      issueCount: result.data.length
    });

    return result.data;
  } catch (error) {
    if (getErrorStatusCode(error) === 404) {
      setRepoLoggerOutcome(context, "github_repo_issues_read_not_found");
      return [];
    }

    throw error;
  }
}

export function getRepoIssues(
  input: {
    repo: string;
    state?: "open" | "closed" | "all";
    perPage?: number;
    page?: number;
    sort?: "comments" | "created" | "updated";
    direction?: "asc" | "desc";
  },
  context: OrpcContext
): Promise<GitHubIssueSummary[]> {
  return _fetchRepoIssues(input, context, context.github.publicOctokit);
}

export function getPrivateRepoIssues(
  input: {
    repo: string;
    state?: "open" | "closed" | "all";
    perPage?: number;
    page?: number;
    sort?: "comments" | "created" | "updated";
    direction?: "asc" | "desc";
  },
  context: OrpcContext
): Promise<GitHubIssueSummary[]> {
  return _fetchRepoIssues(input, context, context.github.privateOctokit);
}
