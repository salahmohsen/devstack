import { type OrpcContext } from "@tsu-stack/api/lib/context/types";

import { getGitHubResourceLocalFirst } from "#@/infrastructure/cache/get-github-resource-local-first";
import { githubCachePolicy } from "#@/infrastructure/cache/github-cache-policy";
import { githubRevalidationSignalKeys } from "#@/infrastructure/cache/github-revalidation";
import { executeGitHubGraphQL, getErrorStatusCode } from "#@/infrastructure/octokit/client";
import {
  createGraphQLResponseMetadata,
  setRepoLoggerContext,
  setRepoLoggerLocalFirstOutcome,
  setRepoLoggerOutcome
} from "#@/repo/shared.utils";
import { type GitHubGraphQLTreeEntryCommitsResponse } from "#@/repo/tree-entry-commits/tree-entry-commits.types";
import {
  mapGraphQLTreeEntryCommits,
  normalizeTreeEntryCommitEntries
} from "#@/repo/tree-entry-commits/tree-entry-commits.utils";
import { type GitHubTreeEntryCommit } from "#@/types";

export async function getTreeEntryCommits(
  input: {
    dirPath?: string;
    entries: string[];
    ref: string;
    repo: string;
  },
  context: OrpcContext
): Promise<Record<string, GitHubTreeEntryCommit | null>> {
  setRepoLoggerContext(context, "getTreeEntryCommits", {
    dirPath: input.dirPath ?? "",
    entryCount: input.entries.length,
    ref: input.ref,
    repo: input.repo
  });

  const source = context.github.source;
  if (!source.isConfigured) {
    setRepoLoggerOutcome(context, "github_tree_entry_commits_read_skipped", {
      reason: source.reason
    });

    return {};
  }

  const signalKey = githubRevalidationSignalKeys.repoCode({
    owner: source.owner,
    repo: input.repo
  });
  const normalizedEntries = normalizeTreeEntryCommitEntries(input.entries);

  if (normalizedEntries.length === 0) {
    setRepoLoggerOutcome(context, "github_tree_entry_commits_read_skipped", {
      reason: "no_entries"
    });

    return {};
  }

  try {
    const result = await getGitHubResourceLocalFirst<Record<string, GitHubTreeEntryCommit | null>>({
      fetcher: async () => {
        const aliases = normalizedEntries.map((name, index) => {
          const entryPath = input.dirPath ? `${input.dirPath}/${name}` : name;

          return `e${index}: history(first: 1, path: ${JSON.stringify(entryPath)}) {
            nodes {
              oid
              message
              committedDate
              author {
                user {
                  login
                  avatarUrl
                  url
                }
              }
            }
          }`;
        });

        const query = `query($owner: String!, $repo: String!, $ref: String!) {
          repository(owner: $owner, name: $repo) {
            object(expression: $ref) {
              ... on Commit {
                ${aliases.join("\n")}
              }
            }
          }
          rateLimit { cost remaining resetAt }
        }`;

        const response = await executeGitHubGraphQL<GitHubGraphQLTreeEntryCommitsResponse>(
          context.github,
          "getTreeEntryCommits.graphql",
          query,
          {
            owner: source.owner,
            repo: input.repo,
            ref: input.ref
          }
        );

        return {
          data: mapGraphQLTreeEntryCommits(response.repository?.object ?? null, normalizedEntries),
          kind: "success",
          metadata: createGraphQLResponseMetadata(response.rateLimit)
        };
      },
      freshForMs: githubCachePolicy.detail.staleTimeMs,
      namespaceKeys: [signalKey],
      owner: source.owner,
      params: {
        ...input,
        entries: normalizedEntries
      },
      resource: "repo.treeEntryCommits.v1",
      runtime: context.github.binding,
      signalKeys: [signalKey]
    });

    setRepoLoggerLocalFirstOutcome(
      context,
      "github_tree_entry_commits_read_completed",
      result.meta,
      {
        commitCount: Object.values(result.data).filter(Boolean).length,
        entryCount: normalizedEntries.length
      }
    );

    return result.data;
  } catch (error) {
    if (getErrorStatusCode(error) === 404) {
      setRepoLoggerOutcome(context, "github_tree_entry_commits_read_not_found");

      return {};
    }

    throw error;
  }
}
