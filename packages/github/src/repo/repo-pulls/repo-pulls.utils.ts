import {
  type GitHubApiActor,
  type GitHubApiLabel,
  type GitHubRestPull
} from "#@/repo/repo-pulls/repo-pulls.types";
import {
  type GitHubActor,
  type GitHubLabel,
  type GitHubPullSummary,
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

export function mapRepoPullSummary(
  pull: GitHubRestPull,
  repository: RepositoryRef
): GitHubPullSummary {
  return {
    author: mapActor(pull.user),
    closedAt: pull.closed_at ?? null,
    comments: pull.comments ?? 0,
    createdAt: pull.created_at,
    id: pull.id,
    isDraft: "draft" in pull ? Boolean(pull.draft) : false,
    labels: mapLabels(pull.labels),
    mergedAt: "merged_at" in pull && typeof pull.merged_at === "string" ? pull.merged_at : null,
    number: pull.number,
    repository,
    state: pull.state,
    title: pull.title,
    updatedAt: pull.updated_at,
    url: pull.html_url
  };
}

export function buildRepoPullRepositoryRef(owner: string, repo: string): RepositoryRef {
  return {
    fullName: `${owner}/${repo}`,
    isPrivate: null,
    name: repo,
    owner,
    url: `https://github.com/${owner}/${repo}`
  };
}
