import {
  type GitHubClient,
  createGitHubOctokit,
  getErrorStatusCode,
  isGitHubNotFoundError
} from "#@/infrastructure/octokit/client";

/**
 * Which auth surface a dual public/private repo fetch is serving.
 * - `public` — guest / publicGet* path (must never return private repo data)
 * - `private` — owner privateGet* path (may include private repos)
 */
export type RepoAccessSurface = "public" | "private";

/** Cache resource key with surface suffix so public/private never collide. */
export function repoCacheResource(base: string, surface: RepoAccessSurface): string {
  return `${base}.${surface}`;
}

/** True when a private repo was resolved on the public surface (must treat as not found). */
export function isPrivateOnPublicSurface(
  surface: RepoAccessSurface,
  isPrivate: boolean | null | undefined
): boolean {
  return surface === "public" && isPrivate === true;
}

/**
 * Synthetic not-found that `getErrorStatusCode` / `isGitHubNotFoundError` both recognize.
 * Prefer throwing this inside cache fetchers so private payloads are never written under
 * `.public` resource keys.
 */
export function createRepoNotFoundError(owner: string, repo: string): Error & { status: number } {
  const error = new Error(`GitHub repository not found: ${owner}/${repo}`) as Error & {
    status: number;
  };
  error.status = 404;
  return error;
}

export function resolveRepoOwnerName(
  repoInput: string,
  sourceOwner: string
): { owner: string; name: string } {
  if (repoInput.includes("/")) {
    const [owner, name, ...rest] = repoInput.split("/");
    if (owner && name && rest.length === 0) {
      return { owner, name };
    }
  }
  return { owner: sourceOwner, name: repoInput };
}

/** Owner OAuth token expired / revoked / insufficient — common production failure mode. */
export function isGitHubAuthError(error: unknown): boolean {
  const status = getErrorStatusCode(error);
  if (status === 401 || status === 403) {
    return true;
  }
  if (!error || typeof error !== "object") {
    return false;
  }
  const message =
    typeof (error as { message?: unknown }).message === "string"
      ? (error as { message: string }).message
      : "";
  return /bad credentials|requires authentication|not authorized|forbidden/i.test(message);
}

/** Unauthenticated Octokit — public repos only, works when the owner OAuth token is dead. */
export function createAnonymousGitHubOctokit(): GitHubClient {
  return createGitHubOctokit();
}

/**
 * Prefer the tenant OAuth client (higher rate limits). On the public surface, if
 * GitHub rejects the token, retry once without credentials so public repos still load.
 */
export async function withPublicGithubClient<T>(
  octokit: GitHubClient,
  surface: RepoAccessSurface,
  run: (client: GitHubClient) => Promise<T>
): Promise<T> {
  try {
    return await run(octokit);
  } catch (error) {
    if (surface !== "public" || !isGitHubAuthError(error)) {
      throw error;
    }
    return await run(createAnonymousGitHubOctokit());
  }
}

/**
 * For REST-based public fetchers that do not return `private` on the content response:
 * load repo metadata first and throw not-found when the repo is private or missing.
 */
export async function assertRepoVisibleOnPublicSurface(
  octokit: GitHubClient,
  owner: string,
  repo: string,
  surface: RepoAccessSurface
): Promise<void> {
  if (surface !== "public") {
    return;
  }

  try {
    await withPublicGithubClient(octokit, surface, async (client) => {
      const response = await client.rest.repos.get({ owner, repo });
      if (response.data.private) {
        throw createRepoNotFoundError(owner, repo);
      }
    });
  } catch (error) {
    // Already our synthetic not-found (private reject).
    if (getErrorStatusCode(error) === 404) {
      throw error;
    }
    if (isGitHubNotFoundError(error)) {
      throw createRepoNotFoundError(owner, repo);
    }
    throw error;
  }
}

/**
 * Call after mapping a GraphQL/REST entity that includes `isPrivate`.
 * On the public surface, private entities throw not-found (no cache write of private data).
 */
export function rejectPrivateEntityOnPublicSurface(
  surface: RepoAccessSurface,
  isPrivate: boolean | null | undefined,
  owner: string,
  repo: string
): void {
  if (isPrivateOnPublicSurface(surface, isPrivate)) {
    throw createRepoNotFoundError(owner, repo);
  }
}
