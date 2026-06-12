import { Octokit } from "octokit";

import { type PublicGitHubSource } from "#@/shared/public-github-source";

export type GitHubConditionalHeaders = {
  etag?: string | null;
  lastModified?: string | null;
};

export type GitHubResponseMetadata = {
  etag: string | null;
  lastModified: string | null;
  rateLimitRemaining: number | null;
  rateLimitReset: number | null;
  statusCode: number;
};

export function createGitHubOctokit(source: Extract<PublicGitHubSource, { isConfigured: true }>) {
  return new Octokit({
    auth: source.token
  });
}

export function createGitHubResponseMetadata(
  statusCode: number,
  headers: Headers | Record<string, unknown>
): GitHubResponseMetadata {
  const getHeader = (name: string) => {
    if (headers instanceof Headers) {
      return headers.get(name);
    }

    const value = headers[name] ?? headers[name.toLowerCase()];
    return typeof value === "string" ? value : null;
  };

  return {
    etag: getHeader("etag"),
    lastModified: getHeader("last-modified"),
    rateLimitRemaining: parseNullableInt(getHeader("x-ratelimit-remaining")),
    rateLimitReset: parseNullableInt(getHeader("x-ratelimit-reset")),
    statusCode
  };
}

export async function executeGitHubGraphQL<TResponse>(
  octokit: Octokit,
  query: string,
  variables: Record<string, unknown>
): Promise<TResponse> {
  return octokit.graphql<TResponse>(query, variables);
}

export function getErrorStatusCode(error: unknown) {
  if (!error || typeof error !== "object") {
    return null;
  }

  return typeof (error as { status?: unknown }).status === "number"
    ? (error as { status: number }).status
    : null;
}

function parseNullableInt(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}
