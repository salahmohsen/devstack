export type GitHubRepoTreeItem = {
  name: string;
  path: string;
  sha: string;
  size?: number | null;
  type: string;
};
