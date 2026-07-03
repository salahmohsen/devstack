import { type GitHubGraphQLRepoDiscussionsResponse } from "#@/repo/repo-discussions/repo-discussions.types";
import { type GitHubDiscussionsResult, type GitHubDiscussionSummary } from "#@/schemas";

export function emptyDiscussionsResult(): GitHubDiscussionsResult {
  return { discussions: [], totalCount: 0 };
}

export function mapGraphQLRepoDiscussions(
  repository: GitHubGraphQLRepoDiscussionsResponse["repository"]
): GitHubDiscussionsResult {
  if (!repository) {
    return emptyDiscussionsResult();
  }

  const discussions: GitHubDiscussionSummary[] = repository.discussions.nodes.flatMap((node) =>
    node
      ? [
          {
            author: node.author,
            category: node.category?.name ?? null,
            comments: node.comments.totalCount,
            createdAt: node.createdAt,
            isAnswered: node.answerChosenAt !== null,
            number: node.number,
            title: node.title,
            updatedAt: node.updatedAt,
            url: node.url
          }
        ]
      : []
  );

  return {
    discussions,
    totalCount: repository.discussions.totalCount
  };
}
