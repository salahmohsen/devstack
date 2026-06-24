import { Octokit, type Octokit as OctokitType } from "octokit";

import { type GitHubRuntimeBindings } from "#@/runtime/bindings";
import { type PublicGitHubSource } from "#@/shared/public-github-source";

export type GitHubClient = OctokitType;
export type GitHubContext = {
  binding: GitHubRuntimeBindings;
  octokit: GitHubClient;
  source: PublicGitHubSource;
};

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

const GITHUB_OPERATION_TIMEOUT_MS = 15_000;

export function createGitHubOctokit(
  source?: Extract<PublicGitHubSource, { isConfigured: true }>
): GitHubClient {
  return new Octokit({
    auth: source?.token
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

class GitHubOperationTimeoutError extends Error {
  timeoutMs: number;

  constructor(label: string, timeoutMs: number) {
    super(`${label} timed out after ${timeoutMs}ms`);
    this.timeoutMs = timeoutMs;
    this.name = "GitHubOperationTimeoutError";
  }
}

async function withGitHubOperationTimeout<T>(
  label: string,
  timeoutMs: number,
  task: (signal: AbortSignal) => Promise<T>
): Promise<T> {
  if (timeoutMs <= 0) {
    throw new GitHubOperationTimeoutError(label, timeoutMs);
  }

  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const taskPromise = task(controller.signal);
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new GitHubOperationTimeoutError(label, timeoutMs));
    }, timeoutMs);
  });

  try {
    return await Promise.race([taskPromise, timeoutPromise]);
  } finally {
    taskPromise.catch(() => {});
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    controller.abort();
  }
}

export async function executeGitHubGraphQL<TResponse>(
  octokit: GitHubClient,
  label: string,
  query: string,
  variables: Record<string, unknown>
): Promise<TResponse> {
  return withGitHubOperationTimeout(label, GITHUB_OPERATION_TIMEOUT_MS, (signal) =>
    octokit.graphql<TResponse>(query, {
      ...variables,
      request: { signal }
    })
  );
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
