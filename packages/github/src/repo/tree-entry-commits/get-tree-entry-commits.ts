import { type OrpcContext } from "@tsu-stack/core";

import { getCachedGitHubRequest } from "#@/infrastructure/cache/get-github-resource-local-first";
import { githubCachePolicy } from "#@/infrastructure/cache/github-cache-policy";
import { githubRevalidationSignalKeys } from "#@/infrastructure/cache/github-revalidation";
import {
  type GitHubClient,
  executeGitHubGraphQL,
  isGitHubNotFoundError
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
import {
  type RepoAccessSurface,
  assertRepoVisibleOnPublicSurface,
  repoCacheResource,
  resolveRepoOwnerName
} from "#@/shared/public-repo-access";
import { type GitHubTreeEntryCommit } from "#@/types";

async function _fetchTreeEntryCommits(
  input: { dirPath?: string; entries: string[]; ref: string; repo: string },
  context: OrpcContext,
  octokit: GitHubClient,
  surface: RepoAccessSurface
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

  try {
    const { owner: privacyOwner, name: privacyRepo } = resolveRepoOwnerName(
      input.repo,
      source.owner
    );
    await assertRepoVisibleOnPublicSurface(octokit, privacyOwner, privacyRepo, surface);
  } catch (error) {
    if (isGitHubNotFoundError(error)) {
      setRepoLoggerOutcome(context, "github_repo_public_access_denied_or_missing");
      return {};
    }
    throw error;
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
    const result = await getCachedGitHubRequest<Record<string, GitHubTreeEntryCommit | null>>({
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
          octokit,
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
      resource: repoCacheResource("repo.treeEntryCommits.v2", surface),
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
    if (isGitHubNotFoundError(error)) {
      setRepoLoggerOutcome(context, "github_tree_entry_commits_read_not_found");

      return {};
    }

    throw error;
  }
}

export function getTreeEntryCommits(
  input: { dirPath?: string; entries: string[]; ref: string; repo: string },
  context: OrpcContext
): Promise<Record<string, GitHubTreeEntryCommit | null>> {
  return _fetchTreeEntryCommits(input, context, context.github.publicOctokit, "public");
}

export function getPrivateTreeEntryCommits(
  input: { dirPath?: string; entries: string[]; ref: string; repo: string },
  context: OrpcContext
): Promise<Record<string, GitHubTreeEntryCommit | null>> {
  return _fetchTreeEntryCommits(input, context, context.github.privateOctokit, "private");
}
