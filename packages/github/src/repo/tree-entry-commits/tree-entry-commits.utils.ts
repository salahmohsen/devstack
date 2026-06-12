import {
  type GitHubGraphQLTreeEntryCommitNode,
  type GitHubGraphQLTreeEntryCommitObject
} from "#@/repo/tree-entry-commits/tree-entry-commits.types";
import { type GitHubTreeEntryCommit } from "#@/types";

export function normalizeTreeEntryCommitEntries(entries: string[]) {
  return [...new Set(entries.map((entry) => entry.trim()).filter(Boolean))].slice(0, 50);
}

export function mapGraphQLTreeEntryCommits(
  commitObject: GitHubGraphQLTreeEntryCommitObject,
  entries: string[]
): Record<string, GitHubTreeEntryCommit | null> {
  const result: Record<string, GitHubTreeEntryCommit | null> = {};

  for (const [index, name] of entries.entries()) {
    const node = commitObject?.[`e${index}`]?.nodes?.[0];
    result[name] = node ? mapGraphQLTreeEntryCommit(node) : null;
  }

  return result;
}

function mapGraphQLTreeEntryCommit(node: GitHubGraphQLTreeEntryCommitNode): GitHubTreeEntryCommit {
  return {
    sha: node.oid,
    message: node.message,
    date: node.committedDate,
    author: node.author?.user
      ? {
          login: node.author.user.login,
          avatarUrl: node.author.user.avatarUrl,
          url: node.author.user.url,
          type: "User"
        }
      : null
  };
}
