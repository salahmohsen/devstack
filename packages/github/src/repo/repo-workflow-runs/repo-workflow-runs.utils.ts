import {
  type GitHubApiActor,
  type GitHubWorkflowRunRaw
} from "#@/repo/repo-workflow-runs/repo-workflow-runs.types";
import { type GitHubActor, type GitHubWorkflowRun } from "#@/schemas";

function mapActor(actor: GitHubApiActor | null | undefined): GitHubActor | null {
  if (!actor?.login) {
    return null;
  }

  return {
    avatarUrl: actor.avatar_url ?? "",
    login: actor.login,
    type: actor.type ?? "User",
    url: actor.html_url ?? `https://github.com/${actor.login}`
  };
}

export function mapRepoWorkflowRun(
  raw: GitHubWorkflowRunRaw,
  options: { viewerCanRerun: boolean }
): GitHubWorkflowRun {
  return {
    actor: mapActor(raw.actor),
    conclusion: raw.conclusion ?? null,
    createdAt: raw.created_at,
    displayTitle: raw.display_title ?? raw.name ?? `Run #${raw.run_number}`,
    event: raw.event,
    headBranch: raw.head_branch ?? null,
    headSha: raw.head_sha,
    htmlUrl: raw.html_url,
    id: raw.id,
    name: raw.name ?? null,
    path: raw.path,
    pullRequests: (raw.pull_requests ?? []).map((pr) => {
      return {
        baseRef: pr.base?.ref ?? "",
        headRef: pr.head?.ref ?? "",
        number: pr.number
      };
    }),
    runAttempt: raw.run_attempt ?? 1,
    runNumber: raw.run_number,
    runStartedAt: raw.run_started_at ?? null,
    status: raw.status,
    triggeringActor: mapActor(raw.triggering_actor),
    updatedAt: raw.updated_at,
    viewerCanRerun: options.viewerCanRerun,
    workflowId: raw.workflow_id
  };
}
