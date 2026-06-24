import { type OrpcContext } from "@tsu-stack/api/lib/context/types";
import { isRecord } from "@tsu-stack/core/utils";

import { getGitHubResourceLocalFirst } from "#@/infrastructure/cache/get-github-resource-local-first";
import { githubCachePolicy } from "#@/infrastructure/cache/github-cache-policy";
import { githubRevalidationSignalKeys } from "#@/infrastructure/cache/github-revalidation";
import {
  type GitHubClient,
  createGitHubResponseMetadata,
  getErrorStatusCode
} from "#@/infrastructure/octokit/client";
import {
  setRepoLoggerContext,
  setRepoLoggerLocalFirstOutcome,
  setRepoLoggerOutcome
} from "#@/repo/shared.utils";
import { type GitHubUserActivityEvent } from "#@/types";

async function _fetchUserActivity(
  input: { page: number },
  context: OrpcContext,
  octokit: GitHubClient
): Promise<GitHubUserActivityEvent[]> {
  setRepoLoggerContext(context, "getUserActivity", {
    page: input.page
  });

  const source = context.github.source;
  if (!source.isConfigured) {
    setRepoLoggerOutcome(context, "github_user_activity_read_skipped", {
      reason: source.reason
    });

    return [];
  }

  const signalKey = githubRevalidationSignalKeys.ownerActivity(source.owner);

  try {
    const result = await getGitHubResourceLocalFirst<GitHubUserActivityEvent[]>({
      fetcher: async () => {
        const response = await octokit.request("GET /users/{username}/events/public", {
          page: input.page,
          per_page: 30,
          username: source.owner
        });

        return {
          data: response.data.map((event) => {
            const payload = isRecord(event.payload)
              ? (event.payload as Record<string, unknown>)
              : {};
            const pullRequest = isRecord(payload["pull_request"])
              ? (payload["pull_request"] as Record<string, unknown>)
              : null;
            const issue = isRecord(payload["issue"])
              ? (payload["issue"] as Record<string, unknown>)
              : null;
            const repoName = event.repo?.name ?? `${source.owner}/unknown`;
            const action = typeof payload["action"] === "string" ? payload["action"] : null;
            const title =
              typeof pullRequest?.["title"] === "string"
                ? pullRequest["title"]
                : typeof issue?.["title"] === "string"
                  ? issue["title"]
                  : typeof payload["ref"] === "string"
                    ? payload["ref"].replace("refs/heads/", "")
                    : null;
            const url =
              typeof pullRequest?.["html_url"] === "string"
                ? pullRequest["html_url"]
                : typeof issue?.["html_url"] === "string"
                  ? issue["html_url"]
                  : null;
            const commits = Array.isArray(payload["commits"])
              ? payload["commits"].flatMap((commit) => {
                  if (!isRecord(commit)) {
                    return [];
                  }

                  const sha = typeof commit["sha"] === "string" ? commit["sha"] : null;
                  const message = typeof commit["message"] === "string" ? commit["message"] : null;

                  return sha && message
                    ? [
                        {
                          message,
                          sha,
                          url: repoName ? `https://github.com/${repoName}/commit/${sha}` : null
                        }
                      ]
                    : [];
                })
              : null;
            const actor =
              event.actor?.login || event.actor?.avatar_url
                ? {
                    avatarUrl: event.actor?.avatar_url ?? null,
                    login: event.actor?.login ?? null
                  }
                : null;
            const repo = {
              name: repoName,
              url: `https://github.com/${repoName}`
            };
            const prState = pullRequest?.["merged_at"]
              ? "merged"
              : pullRequest?.["state"] === "open"
                ? "open"
                : pullRequest?.["state"] === "closed"
                  ? "closed"
                  : null;
            const issueState =
              issue?.["state"] === "open"
                ? "open"
                : issue?.["state"] === "closed"
                  ? "closed"
                  : null;

            return {
              action,
              actor,
              commentBody:
                typeof payload["comment"] === "object" && isRecord(payload["comment"])
                  ? typeof payload["comment"]["body"] === "string"
                    ? payload["comment"]["body"]
                    : null
                  : null,
              commits,
              createdAt: event.created_at ?? "",
              id: event.id,
              issueDetail:
                issueState &&
                typeof issue?.["number"] === "number" &&
                typeof issue?.["title"] === "string" &&
                typeof issue?.["html_url"] === "string"
                  ? {
                      number: issue["number"],
                      state: issueState,
                      title: issue["title"],
                      url: issue["html_url"]
                    }
                  : null,
              prDetail:
                prState &&
                typeof pullRequest?.["number"] === "number" &&
                typeof pullRequest?.["title"] === "string" &&
                typeof pullRequest?.["html_url"] === "string"
                  ? {
                      number: pullRequest["number"],
                      state: prState,
                      title: pullRequest["title"],
                      url: pullRequest["html_url"]
                    }
                  : null,
              ref: typeof payload["ref"] === "string" ? payload["ref"] : null,
              refType: typeof payload["ref_type"] === "string" ? payload["ref_type"] : null,
              repo,
              repoName,
              title,
              type: event.type ?? "",
              url
            };
          }),
          kind: "success",
          metadata: createGitHubResponseMetadata(response.status, response.headers)
        };
      },
      freshForMs: githubCachePolicy.userActivity.staleTimeMs,
      namespaceKeys: [signalKey],
      owner: source.owner,
      params: input,
      resource: "user.activity.v1",
      runtime: context.github.binding,
      signalKeys: [signalKey]
    });

    setRepoLoggerLocalFirstOutcome(context, "github_user_activity_read_completed", result.meta, {
      eventCount: result.data.length
    });

    return result.data;
  } catch (error) {
    const statusCode = getErrorStatusCode(error);

    setRepoLoggerOutcome(
      context,
      statusCode === 404
        ? "github_user_activity_read_not_found"
        : "github_user_activity_read_failed",
      statusCode ? { statusCode } : {}
    );

    return [];
  }
}

export function getUserActivity(
  input: { page: number },
  context: OrpcContext
): Promise<GitHubUserActivityEvent[]> {
  return _fetchUserActivity(input, context, context.github.publicOctokit);
}

export function getPrivateUserActivity(
  input: { page: number },
  context: OrpcContext
): Promise<GitHubUserActivityEvent[]> {
  return _fetchUserActivity(input, context, context.github.privateOctokit);
}
