import {
  type GitHubGraphQLActor,
  type GitHubGraphQLRepoOverviewResponse
} from "#@/repo/repo-overview/repo-overview.types";
import { type RepoOverview } from "#@/repo/shared.types";
import { type GitHubActor } from "#@/types";

export function mapGraphQLRepoOverview(
  repository: NonNullable<GitHubGraphQLRepoOverviewResponse["repository"]>
): RepoOverview {
  const latestCommitTarget = repository.defaultBranchRef?.target;
  const latestCommit =
    latestCommitTarget?.__typename === "Commit" && latestCommitTarget.oid
      ? {
          sha: latestCommitTarget.oid,
          message: latestCommitTarget.message ?? "",
          date: latestCommitTarget.committedDate ?? "",
          author: mapGraphQLActor(
            latestCommitTarget.author?.user
              ? {
                  ...latestCommitTarget.author.user,
                  __typename: "User"
                }
              : null
          )
        }
      : null;

  return {
    id: repository.databaseId ?? 0,
    name: repository.name,
    fullName: repository.nameWithOwner,
    description: repository.description,
    isPrivate: repository.isPrivate,
    isFork: repository.isFork,
    viewerHasStarred: false,
    defaultBranch: repository.defaultBranchRef?.name ?? "main",
    stars: repository.stargazerCount,
    forks: repository.forkCount,
    watchers: repository.watchers.totalCount,
    language: repository.primaryLanguage?.name ?? null,
    license: repository.licenseInfo?.spdxId ?? null,
    topics: (repository.repositoryTopics.nodes ?? []).flatMap((node) =>
      node ? [node.topic.name] : []
    ),
    url: repository.url,
    owner: repository.owner.login,
    ownerAvatarUrl: repository.owner.avatarUrl,
    branchCount: repository.branches.totalCount,
    tagCount: repository.tags.totalCount,
    openPullCount: repository.pullRequests.totalCount,
    openIssueCount: repository.issues.totalCount,
    hasDiscussions: repository.hasDiscussionsEnabled,
    forkParentFullName: repository.parent?.nameWithOwner ?? null,
    forkParentOwnerAvatarUrl: repository.parent?.owner.avatarUrl ?? null,
    latestCommit
  };
}

function mapGraphQLActor(actor: GitHubGraphQLActor): GitHubActor | null {
  if (!actor?.login) {
    return null;
  }

  return {
    login: actor.login,
    avatarUrl: actor.avatarUrl,
    url: actor.url,
    type: actor.__typename ?? "User"
  };
}
