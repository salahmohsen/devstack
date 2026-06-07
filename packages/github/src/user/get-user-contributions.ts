import { getGitHubResourceLocalFirst } from "#@/infrastructure/cache/get-github-resource-local-first";
import { githubCachePolicy } from "#@/infrastructure/cache/github-cache-policy";
import { githubRevalidationSignalKeys } from "#@/infrastructure/cache/github-revalidation";
import {
  createGitHubOctokit,
  createGitHubResponseMetadata,
  executeGitHubGraphQL
} from "#@/infrastructure/octokit/client";
import { type GitHubRuntimeBindings } from "#@/runtime/bindings";
import { resolvePublicGitHubSource } from "#@/shared/public-github-source";
import { type GitHubContributionCalendar } from "#@/types";

export async function getUserContributions(
  username: string,
  runtime?: GitHubRuntimeBindings
): Promise<GitHubContributionCalendar | null> {
  const source = await resolvePublicGitHubSource();
  if (!source.isConfigured) {
    return null;
  }

  const octokit = createGitHubOctokit(source);
  const signalKey = githubRevalidationSignalKeys.ownerContributions(username);

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
          { username }
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
      params: { username },
      resource: "user.contributions.v1",
      runtime,
      signalKeys: [signalKey]
    });

    return result.data;
  } catch {
    return null;
  }
}
