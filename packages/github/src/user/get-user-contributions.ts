import { type OrpcContext } from "@tsu-stack/core/orpc-context";

import { getGitHubResourceLocalFirst } from "#@/infrastructure/cache/get-github-resource-local-first";
import { githubCachePolicy } from "#@/infrastructure/cache/github-cache-policy";
import { githubRevalidationSignalKeys } from "#@/infrastructure/cache/github-revalidation";
import {
  type GitHubClient,
  createGitHubResponseMetadata,
  executeGitHubGraphQL,
  getErrorStatusCode
} from "#@/infrastructure/octokit/client";
import { setRepoLoggerLocalFirstOutcome, setRepoLoggerOutcome } from "#@/repo/shared.utils";
import { type GitHubContributionCalendar } from "#@/types";

async function _fetchUserContributions(
  context: OrpcContext,
  octokit: GitHubClient
): Promise<GitHubContributionCalendar | null> {
  const source = context.github.source;
  if (!source.isConfigured) {
    setRepoLoggerOutcome(context, "github_user_contributions_read_skipped", {
      reason: source.reason
    });

    return null;
  }

  const signalKey = githubRevalidationSignalKeys.ownerContributions(source.owner);

  try {
    const result = await getGitHubResourceLocalFirst<GitHubContributionCalendar>({
      fetcher: async () => {
        const response = await executeGitHubGraphQL<{
          rateLimit: {
            remaining: number;
            resetAt: string;
          };
          user: {
            contributionsCollection: {
              contributionCalendar: {
                totalContributions: number;
                weeks: Array<{
                  contributionDays: Array<{
                    contributionCount: number;
                    contributionLevel:
                      | "NONE"
                      | "FIRST_QUARTILE"
                      | "SECOND_QUARTILE"
                      | "THIRD_QUARTILE"
                      | "FOURTH_QUARTILE";
                    date: string;
                  }>;
                }>;
              };
            };
          };
        }>(
          octokit,
          "getUserContributions.graphql",
          `query($username: String!) {
            user(login: $username) {
              contributionsCollection {
                contributionCalendar {
                  totalContributions
                  weeks {
                    contributionDays {
                      date
                      contributionCount
                      contributionLevel
                    }
                  }
                }
              }
            }
            rateLimit {
              remaining
              resetAt
            }
          }`,
          { username: source.owner }
        );

        const levelMap: Record<string, 0 | 1 | 2 | 3 | 4> = {
          FIRST_QUARTILE: 1,
          FOURTH_QUARTILE: 4,
          NONE: 0,
          SECOND_QUARTILE: 2,
          THIRD_QUARTILE: 3
        };
        const calendar = response.user.contributionsCollection.contributionCalendar;

        return {
          data: {
            totalContributions: calendar.totalContributions,
            weeks: calendar.weeks.map((week) => {
              return {
                days: week.contributionDays.map((day) => {
                  return {
                    count: day.contributionCount,
                    date: day.date,
                    level: levelMap[day.contributionLevel] ?? 0
                  };
                })
              };
            })
          },
          kind: "success",
          metadata: createGitHubResponseMetadata(200, {
            "x-ratelimit-remaining": String(response.rateLimit.remaining),
            "x-ratelimit-reset": String(
              Math.floor(new Date(response.rateLimit.resetAt).getTime() / 1000)
            )
          })
        };
      },
      freshForMs: githubCachePolicy.contributions.staleTimeMs,
      namespaceKeys: [signalKey],
      owner: source.owner,
      params: { username: source.owner },
      resource: "user.contributions.v1",
      runtime: context.github.binding,
      signalKeys: [signalKey]
    });

    setRepoLoggerLocalFirstOutcome(
      context,
      "github_user_contributions_read_completed",
      result.meta,
      {
        totalContributions: result.data.totalContributions,
        weekCount: result.data.weeks.length
      }
    );

    return result.data;
  } catch (error) {
    const statusCode = getErrorStatusCode(error);

    setRepoLoggerOutcome(
      context,
      statusCode === 404
        ? "github_user_contributions_read_not_found"
        : "github_user_contributions_read_failed",
      statusCode ? { statusCode } : {}
    );

    return null;
  }
}

export function getUserContributions(
  context: OrpcContext
): Promise<GitHubContributionCalendar | null> {
  return _fetchUserContributions(context, context.github.publicOctokit);
}

export function getPrivateUserContributions(
  context: OrpcContext
): Promise<GitHubContributionCalendar | null> {
  return _fetchUserContributions(context, context.github.privateOctokit);
}
