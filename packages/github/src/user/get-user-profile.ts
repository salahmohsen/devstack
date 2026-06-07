import { getGitHubResourceLocalFirst } from "#@/infrastructure/cache/get-github-resource-local-first";
import { githubCachePolicy } from "#@/infrastructure/cache/github-cache-policy";
import { githubRevalidationSignalKeys } from "#@/infrastructure/cache/github-revalidation";
import {
  createGitHubOctokit,
  createGitHubResponseMetadata,
  getErrorStatusCode
} from "#@/infrastructure/octokit/client";
import { type GitHubRuntimeBindings } from "#@/runtime/bindings";
import { resolvePublicGitHubSource } from "#@/shared/public-github-source";
import { type GitHubUserProfile } from "#@/types";

export async function getUserProfile(
  username: string,
  runtime?: GitHubRuntimeBindings
): Promise<GitHubUserProfile | null> {
  const source = await resolvePublicGitHubSource();
  if (!source.isConfigured) {
    return null;
  }

  const octokit = createGitHubOctokit(source);
  const ownerProfileKey = githubRevalidationSignalKeys.ownerProfile(username);

  try {
    const result = await getGitHubResourceLocalFirst<GitHubUserProfile>({
      fetcher: async (conditionals) => {
        const response = await octokit.rest.users.getByUsername({
          headers: buildConditionalHeaders(conditionals),
          username
        });
        const user = response.data;

        return {
          data: {
            avatarUrl: user.avatar_url,
            bio: user.bio ?? null,
            blog: user.blog ?? null,
            company: user.company ?? null,
            createdAt: user.created_at,
            followers: user.followers ?? 0,
            following: user.following ?? 0,
            id: user.id,
            location: user.location ?? null,
            login: user.login,
            name: user.name ?? null,
            publicRepos: user.public_repos ?? 0,
            twitterUsername: user.twitter_username ?? null,
            url: user.html_url
          },
          kind: "success",
          metadata: createGitHubResponseMetadata(response.status, response.headers)
        };
      },
      freshForMs: githubCachePolicy.mine.staleTimeMs,
      namespaceKeys: [ownerProfileKey],
      owner: source.owner,
      params: { username },
      resource: "user.profile.v1",
      runtime,
      signalKeys: [ownerProfileKey]
    });

    return result.data;
  } catch (error) {
    if (getErrorStatusCode(error) === 404) {
      return null;
    }
    throw error;
  }
}

function buildConditionalHeaders(conditionals: {
  etag?: string | null;
  lastModified?: string | null;
}) {
  return {
    ...(conditionals.etag ? { "if-none-match": conditionals.etag } : {}),
    ...(conditionals.lastModified ? { "if-modified-since": conditionals.lastModified } : {})
  };
}
