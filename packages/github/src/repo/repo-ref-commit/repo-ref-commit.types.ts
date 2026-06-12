export type GitHubRepoRefCommitItem = {
  author?: {
    avatar_url?: string | null;
    login?: string | null;
  } | null;
  commit: {
    author?: {
      date?: string | null;
    } | null;
    committer?: {
      date?: string | null;
    } | null;
    message?: string | null;
  };
  html_url?: string | null;
  sha?: string | null;
};
