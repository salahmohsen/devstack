import { Octokit, type Octokit as OctokitType } from "octokit";

import { type GitHubRuntimeBindings } from "#@/runtime/bindings";
import {
  invalidatePublicGitHubSourceCache,
  resolvePublicGitHubSourceForUser,
  type PublicGitHubSource
} from "#@/shared/public-github-source";

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

/**
 * Cloudflare Workers ties fetch response bodies to the request that
 * created them. If a GitHub request hits the operation timeout abort
 * signal, Octokit returns a Response whose body stream is still in
 * scope but the request is already gone — the next request that
 * reads the body fails with "Cannot perform I/O on behalf of a
 * different request" and the original promise hangs forever.
 *
 * Wrapping fetch to always drain the body before returning closes the
 * I/O window so the stream can never be read by a different request.
 */
function createRequestScopedFetch(baseFetch: typeof fetch): typeof fetch {
  return async (input, init) => {
    const response = await baseFetch(input, init);
    try {
      // Buffer the body into memory so the underlying stream is closed
      // before the response leaves this request's I/O scope. A no-op
      // clone keeps the response usable for any consumer that needs
      // to re-parse or stream the body later.
      await response.clone().arrayBuffer();
    } catch {
      // Body drain is best-effort; if it throws (e.g. network reset)
      // the original response is still returned and Octokit will
      // surface the real error to its caller.
    }
    return response;
  };
}

export function createGitHubOctokit(
  source?: Extract<PublicGitHubSource, { isConfigured: true }>
): GitHubClient {
  const scopedFetch = createRequestScopedFetch(globalThis.fetch);
  let token = source?.token;
  const fetchWithTokenRecovery: typeof fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input);
    if (!source || url.origin !== "https://api.github.com") return scopedFetch(input, init);

    const headers = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined)
    );
    const requestToken = token;
    headers.set("authorization", `Bearer ${requestToken}`);
    const response = await scopedFetch(input instanceof Request ? input.clone() : input, {
      ...init,
      headers
    });
    if (response.status !== 401) return response;

    invalidatePublicGitHubSourceCache(source.userId);
    const refreshed = await resolvePublicGitHubSourceForUser(source.userId);
    if (!refreshed.isConfigured) return response;
    if (refreshed.token === requestToken) {
      invalidatePublicGitHubSourceCache(source.userId);
      return response;
    }

    token = refreshed.token;
    headers.set("authorization", `Bearer ${token}`);
    const retried = await scopedFetch(input, { ...init, headers });
    if (retried.status === 401) invalidatePublicGitHubSourceCache(source.userId);
    return retried;
  };
  return new Octokit({
    auth: source?.token,
    // Use the global `fetch` so the request is bound to the current
    // request's I/O context, then drain the body so an aborted
    // request can never leak its body stream to a sibling request.
    request: { fetch: fetchWithTokenRecovery }
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

  if (typeof (error as { status?: unknown }).status === "number") {
    return (error as { status: number }).status;
  }

  // Octokit RequestError sometimes nests status on response
  const response = (error as { response?: { status?: unknown } }).response;
  if (response && typeof response.status === "number") {
    return response.status;
  }

  return null;
}

/**
 * GraphQL "repository not found" often has no HTTP 404 — Octokit throws with
 * message/errors like "Could not resolve to a Repository with the name …".
 * Treat those as not-found so handlers can return empty/null instead of 500.
 */
export function isGitHubNotFoundError(error: unknown): boolean {
  if (getErrorStatusCode(error) === 404) {
    return true;
  }
  if (!error || typeof error !== "object") {
    return false;
  }

  const message =
    typeof (error as { message?: unknown }).message === "string"
      ? (error as { message: string }).message
      : "";
  if (/could not resolve to a repository/i.test(message)) {
    return true;
  }

  const errors = (error as { errors?: unknown }).errors;
  if (!Array.isArray(errors)) {
    return false;
  }

  return errors.some((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const type = (entry as { type?: unknown }).type;
    const entryMessage = (entry as { message?: unknown }).message;
    if (type === "NOT_FOUND") return true;
    return (
      typeof entryMessage === "string" && /could not resolve to a repository/i.test(entryMessage)
    );
  });
}

function parseNullableInt(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}
