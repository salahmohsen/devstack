import { type OrpcContext } from "@tsu-stack/core/orpc-context";

import { getCachedGitHubRequest } from "#@/infrastructure/cache/get-github-resource-local-first";
import { githubCachePolicy } from "#@/infrastructure/cache/github-cache-policy";
import { githubRevalidationSignalKeys } from "#@/infrastructure/cache/github-revalidation";
import {
  type GitHubClient,
  createGitHubResponseMetadata,
  getErrorStatusCode
} from "#@/infrastructure/octokit/client";
import { type GitHubWorkflowRunRaw } from "#@/repo/repo-workflow-runs/repo-workflow-runs.types";
import { mapRepoWorkflowRun } from "#@/repo/repo-workflow-runs/repo-workflow-runs.utils";
import {
  buildGitHubConditionalHeaders,
  setRepoLoggerContext,
  setRepoLoggerLocalFirstOutcome,
  setRepoLoggerOutcome
} from "#@/repo/shared.utils";
import { type GitHubWorkflowRun } from "#@/schemas";

const REPO_RUNS_PER_PAGE = 5;
const REPO_RUNS_MAX_PER_PAGE = 100;

function clampPerPage(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return REPO_RUNS_PER_PAGE;
  }
  return Math.min(Math.max(Math.trunc(value ?? REPO_RUNS_PER_PAGE), 1), REPO_RUNS_MAX_PER_PAGE);
}

function clampPage(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.max(Math.trunc(value ?? 1), 1);
}

async function _fetchRepoWorkflowRuns(
  input: { repo: string; perPage?: number; page?: number },
  context: OrpcContext,
  octokit: GitHubClient
): Promise<GitHubWorkflowRun[]> {
  setRepoLoggerContext(context, "getRepoWorkflowRuns", {
    repo: input.repo
  });

  const source = context.github.source;
  if (!source.isConfigured) {
    setRepoLoggerOutcome(context, "github_repo_workflow_runs_read_skipped", {
      reason: source.reason
    });
    return [];
  }

  const owner = source.owner;
  const repo = input.repo;
  const signalKey = githubRevalidationSignalKeys.actionsRepo({ owner, repo });
  const perPage = clampPerPage(input.perPage);
  const page = clampPage(input.page);

  try {
    const result = await getCachedGitHubRequest<GitHubWorkflowRun[]>({
      fetcher: async (conditionals) => {
        const response = await octokit.rest.actions.listWorkflowRunsForRepo({
          headers: buildGitHubConditionalHeaders(conditionals),
          owner,
          repo,
          page,
          per_page: perPage
        });

        return {
          data: response.data.workflow_runs.map((run) =>
            mapRepoWorkflowRun(run as unknown as GitHubWorkflowRunRaw, { viewerCanRerun: false })
          ),
          kind: "success",
          metadata: createGitHubResponseMetadata(response.status, response.headers)
        };
      },
      freshForMs: githubCachePolicy.list.staleTimeMs,
      namespaceKeys: [signalKey],
      owner,
      params: input,
      resource: "repo.workflowRuns.list.v1",
      runtime: context.github.binding,
      signalKeys: [signalKey]
    });

    setRepoLoggerLocalFirstOutcome(
      context,
      "github_repo_workflow_runs_read_completed",
      result.meta,
      { runCount: result.data.length }
    );

    return result.data;
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    if (statusCode === 404 || statusCode === 403) {
      setRepoLoggerOutcome(context, "github_repo_workflow_runs_read_not_available", { statusCode });
      return [];
    }

    throw error;
  }
}

export function getRepoWorkflowRuns(
  input: { repo: string; perPage?: number; page?: number },
  context: OrpcContext
): Promise<GitHubWorkflowRun[]> {
  return _fetchRepoWorkflowRuns(input, context, context.github.publicOctokit);
}

export function getPrivateRepoWorkflowRuns(
  input: { repo: string; perPage?: number; page?: number },
  context: OrpcContext
): Promise<GitHubWorkflowRun[]> {
  return _fetchRepoWorkflowRuns(input, context, context.github.privateOctokit);
}
