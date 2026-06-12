import { type GitHubRepoBranchComparisonData } from "#@/repo/repo-branch-comparison/repo-branch-comparison.types";
import { type GitHubRepoBranchComparison } from "#@/types";

export function mapGitHubRepoBranchComparison(
  comparison: GitHubRepoBranchComparisonData
): GitHubRepoBranchComparison {
  return {
    aheadBy: comparison.ahead_by,
    behindBy: comparison.behind_by
  };
}
