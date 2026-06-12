import { type GitHubRepoRefCommitItem } from "#@/repo/repo-ref-commit/repo-ref-commit.types";
import { type GitHubRepoLatestCommit } from "#@/types";

export function emptyGitHubRepoLatestCommit(): GitHubRepoLatestCommit {
  return {
    authorAvatarUrl: null,
    authorLogin: null,
    committedAt: null,
    message: null,
    sha: null,
    url: null
  };
}

export function mapGitHubRepoLatestCommit(
  commit: GitHubRepoRefCommitItem | undefined
): GitHubRepoLatestCommit {
  if (!commit) {
    return emptyGitHubRepoLatestCommit();
  }

  return {
    authorAvatarUrl: commit.author?.avatar_url ?? null,
    authorLogin: commit.author?.login ?? null,
    committedAt: commit.commit.author?.date ?? commit.commit.committer?.date ?? null,
    message: commit.commit.message ?? null,
    sha: commit.sha ?? null,
    url: commit.html_url ?? null
  };
}
