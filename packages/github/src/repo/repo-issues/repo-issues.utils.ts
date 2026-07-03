import {
  type GitHubApiActor,
  type GitHubApiLabel,
  type GitHubRestIssue
} from "#@/repo/repo-issues/repo-issues.types";
import {
  type GitHubActor,
  type GitHubIssueSummary,
  type GitHubLabel,
  type RepositoryRef
} from "#@/schemas";

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

function mapLabel(label: string | GitHubApiLabel | null | undefined): GitHubLabel | null {
  if (!label || typeof label === "string" || !label.name) {
    return null;
  }

  return {
    color: label.color ?? "000000",
    description: label.description ?? null,
    name: label.name
  };
}

function mapLabels(labels: Array<string | GitHubApiLabel> | null | undefined): GitHubLabel[] {
  return (labels ?? [])
    .map((label) => mapLabel(label))
    .filter((label): label is GitHubLabel => Boolean(label));
}

export function mapRepoIssueSummary(
  issue: GitHubRestIssue,
  repository: RepositoryRef
): GitHubIssueSummary {
  return {
    author: mapActor(issue.user),
    closedAt: issue.closed_at ?? null,
    comments: issue.comments,
    createdAt: issue.created_at,
    id: issue.id,
    labels: mapLabels(issue.labels),
    number: issue.number,
    repository,
    state: issue.state,
    stateReason:
      "state_reason" in issue && typeof issue.state_reason === "string" ? issue.state_reason : null,
    title: issue.title,
    updatedAt: issue.updated_at,
    url: issue.html_url
  };
}

export function buildRepoIssueRepositoryRef(owner: string, repo: string): RepositoryRef {
  return {
    fullName: `${owner}/${repo}`,
    isPrivate: null,
    name: repo,
    owner,
    url: `https://github.com/${owner}/${repo}`
  };
}
