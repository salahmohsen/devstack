import { type GitHubGraphQLRepoBranchesResponse } from "#@/repo/repo-branches/repo-branches.types";
import { type GitHubRepoBranch } from "#@/types";

export function mapGraphQLRepoBranches(
  repository: GitHubGraphQLRepoBranchesResponse["repository"]
): GitHubRepoBranch[] {
  const defaultBranch = repository?.defaultBranchRef?.name ?? null;

  return (
    repository?.refs.nodes.flatMap((branch) =>
      branch
        ? [
            {
              committedAt: branch.target?.committedDate ?? null,
              isDefault: branch.name === defaultBranch,
              name: branch.name,
              sha: branch.target?.oid ?? null,
              url: branch.target?.url ?? null
            } satisfies GitHubRepoBranch
          ]
        : []
    ) ?? []
  );
}
