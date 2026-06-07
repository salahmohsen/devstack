export type GitHubRepoCommitListItem = {
  commit: {
    author?: {
      date?: string | null;
    } | null;
    committer?: {
      date?: string | null;
    } | null;
  };
};
