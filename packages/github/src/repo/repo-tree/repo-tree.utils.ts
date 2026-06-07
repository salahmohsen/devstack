import { type GitHubRepoTreeItem } from "#@/repo/repo-tree/repo-tree.types";
import { type GitHubRepoTreeEntry } from "#@/types";

export function mapGitHubRepoTreeEntries(
  data: GitHubRepoTreeItem[] | GitHubRepoTreeItem
): GitHubRepoTreeEntry[] {
  const entries = Array.isArray(data)
    ? data.map((item) => {
        return {
          name: item.name,
          path: item.path,
          sha: item.sha,
          size: item.size ?? null,
          type: (item.type === "dir" ? "dir" : item.type === "submodule" ? "submodule" : "file") as
            | "dir"
            | "file"
            | "submodule"
        };
      })
    : [];

  entries.sort((a, b) => {
    if (a.type === "dir" && b.type !== "dir") return -1;
    if (a.type !== "dir" && b.type === "dir") return 1;
    return a.name.localeCompare(b.name);
  });

  return entries;
}
