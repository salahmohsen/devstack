import { type OrpcContext } from "@tsu-stack/api/lib/context/types";

import { getGitHubResourceLocalFirst } from "#@/infrastructure/cache/get-github-resource-local-first";
import { githubCachePolicy } from "#@/infrastructure/cache/github-cache-policy";
import { githubRevalidationSignalKeys } from "#@/infrastructure/cache/github-revalidation";
import {
  createGitHubOctokit,
  executeGitHubGraphQL,
  getErrorStatusCode
} from "#@/infrastructure/octokit/client";
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
import { resolvePublicGitHubSource } from "#@/shared/public-github-source";
import { type GitHubTreeEntryCommit } from "#@/types";

export async function getTreeEntryCommits(
  input: {
    dirPath?: string;
    entries: string[];
    ref: string;
    repo: string;
  },
  context?: OrpcContext
): Promise<Record<string, GitHubTreeEntryCommit | null>> {
  setRepoLoggerContext(context, "getTreeEntryCommits", {
    dirPath: input.dirPath ?? "",
    entryCount: input.entries.length,
    ref: input.ref,
    repo: input.repo
  });

  const source = await resolvePublicGitHubSource();
  if (!source.isConfigured) {
    setRepoLoggerOutcome(context, "github_tree_entry_commits_read_skipped", {
      reason: source.reason
    });

    return {};
  }

  const octokit = createGitHubOctokit(source);
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

        context?.logger.info(
          "⏳ [getTreeEntryCommits] Fetching commits for tree entries from GitHub GraphQL API...",
          {
            owner: source.owner,
            repo: input.repo,
            ref: input.ref,
            dirPath: input.dirPath,
            entries: normalizedEntries
          }
        );

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

        context?.logger.info("⏳ [getTreeEntryCommits] Executing GitHub GraphQL query...", {
          query,
          variables: {
            owner: source.owner,
            repo: input.repo,
            ref: input.ref
          }
        });

        const response = await executeGitHubGraphQL<GitHubGraphQLTreeEntryCommitsResponse>(
          octokit,
          query,
          {
            owner: source.owner,
            repo: input.repo,
            ref: input.ref
          }
        );

        context?.logger.info(
          "✅ [getTreeEntryCommits] Successfully fetched commits for tree entries from GitHub GraphQL API",
          {
            rateLimit: response.rateLimit,
            repositoryObjectType: response.repository?.object
              ? response.repository.object.__typename
              : null
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
      runtime: context?.github,
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
