import { betterAuthAccountRepository, githubConfigRepository } from "@tsu-stack/db/repositories";
import { ENV_SERVER } from "@tsu-stack/env/server/env";

export type PublicGitHubSource =
  | {
      isConfigured: false;
      reason: "missing_github_configuration";
    }
  | {
      isConfigured: true;
      owner: string;
      token: string;
      userId: string;
    };

const GITHUB_TOKEN_ENDPOINT = "https://github.com/login/oauth/access_token";
const ACCESS_TOKEN_SKEW_MS = 5_000;
/** Bound outbound GitHub HTTP so RPC context creation cannot hang the server. */
const GITHUB_HTTP_TIMEOUT_MS = 5_000;
/**
 * Short in-memory cache — every oRPC request previously resolved + refreshed
 * tokens and hit api.github.com/user, which piled up and timed out undici.
 */
const SOURCE_CACHE_TTL_MS = 30_000;

const cachedByUserId = new Map<string, { value: PublicGitHubSource; expiresAt: number }>();
const inflightByUserId = new Map<string, Promise<PublicGitHubSource>>();
/** Serialize token refresh so concurrent requests don't stampede GitHub. */
let inflightRefresh: Promise<string | null> | null = null;

/**
 * Resolve GitHub credentials for a **specific app user** (tenant).
 *
 * Tokens come from Better Auth's GitHub `account` row (OAuth), with refresh
 * when expired. Never uses a global "first configured" owner.
 *
 * The token never leaves the server — public HTTP handlers only return
 * already-fetched public data shapes.
 */
export async function resolvePublicGitHubSourceForUser(
  userId: string
): Promise<PublicGitHubSource> {
  const now = Date.now();
  const cached = cachedByUserId.get(userId);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const inflight = inflightByUserId.get(userId);
  if (inflight) {
    return inflight;
  }

  const promise = resolvePublicGitHubSourceForUserUncached(userId)
    .then((value) => {
      cachedByUserId.set(userId, { value, expiresAt: Date.now() + SOURCE_CACHE_TTL_MS });
      return value;
    })
    .finally(() => {
      inflightByUserId.delete(userId);
    });

  inflightByUserId.set(userId, promise);
  return promise;
}

/**
 * @deprecated Global single-owner resolution. Always returns not configured.
 * Use {@link resolvePublicGitHubSourceForUser} with a tenant `userId`.
 */
export async function resolvePublicGitHubSource(): Promise<PublicGitHubSource> {
  return {
    isConfigured: false,
    reason: "missing_github_configuration"
  };
}

/** Drop cache (e.g. after sign-in / config change). */
export function invalidatePublicGitHubSourceCache(userId?: string): void {
  if (userId) {
    cachedByUserId.delete(userId);
    return;
  }
  cachedByUserId.clear();
}

async function resolvePublicGitHubSourceForUserUncached(
  userId: string
): Promise<PublicGitHubSource> {
  const settings = await githubConfigRepository.findByUserId(userId);
  const githubAccount = await betterAuthAccountRepository.findGitHubAccountForUser(userId);

  if (!githubAccount?.accessToken && !githubAccount?.refreshToken) {
    return {
      isConfigured: false,
      reason: "missing_github_configuration"
    };
  }

  const token = await getValidAccessToken(githubAccount);
  if (!token) {
    return {
      isConfigured: false,
      reason: "missing_github_configuration"
    };
  }

  const ownerFromConfig = settings?.githubUsername?.trim();
  // Prefer stored username — avoid a GitHub /user round-trip on every request.
  const owner =
    (ownerFromConfig && ownerFromConfig.length > 0 ? ownerFromConfig : null) ??
    (await fetchGitHubLogin(token)) ??
    null;

  if (!owner) {
    return {
      isConfigured: false,
      reason: "missing_github_configuration"
    };
  }

  // Keep username in github_config for identity without storing a PAT.
  if (owner !== settings?.githubUsername) {
    await githubConfigRepository.upsertUsername(userId, owner).catch(() => undefined);
  }

  return {
    isConfigured: true,
    owner,
    token,
    userId
  };
}

async function getValidAccessToken(
  row: NonNullable<Awaited<ReturnType<typeof betterAuthAccountRepository.findGitHubAccountForUser>>>
): Promise<string | null> {
  const accessTokenRaw = row.accessToken?.trim();
  const refreshTokenRaw = row.refreshToken?.trim();
  const accessToken = accessTokenRaw && accessTokenRaw.length > 0 ? accessTokenRaw : null;
  const refreshToken = refreshTokenRaw && refreshTokenRaw.length > 0 ? refreshTokenRaw : null;

  const expiresAt = row.accessTokenExpiresAt ? new Date(row.accessTokenExpiresAt).getTime() : null;

  // Only refresh when we know the token is expired/near-expiry, or we have no access token.
  const knownExpired = expiresAt != null && expiresAt - Date.now() < ACCESS_TOKEN_SKEW_MS;
  const needsRefresh = Boolean(refreshToken) && (!accessToken || knownExpired);

  if (!needsRefresh) {
    return accessToken;
  }

  if (!refreshToken) {
    return accessToken;
  }

  const clientId = ENV_SERVER.GITHUB_CLIENT_ID;
  const clientSecret = ENV_SERVER.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return accessToken;
  }

  if (inflightRefresh) {
    return inflightRefresh;
  }

  inflightRefresh = refreshAccessToken({
    accountId: row.id,
    accessToken,
    refreshToken,
    scope: row.scope,
    clientId,
    clientSecret
  }).finally(() => {
    inflightRefresh = null;
  });

  return inflightRefresh;
}

async function refreshAccessToken(args: {
  accountId: string;
  accessToken: string | null;
  refreshToken: string;
  scope: string | null | undefined;
  clientId: string;
  clientSecret: string;
}): Promise<string | null> {
  try {
    const body = new URLSearchParams({
      client_id: args.clientId,
      client_secret: args.clientSecret,
      grant_type: "refresh_token",
      refresh_token: args.refreshToken
    });

    const res = await fetch(GITHUB_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "tsu-stack"
      },
      body,
      signal: AbortSignal.timeout(GITHUB_HTTP_TIMEOUT_MS)
    });

    const data = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      refresh_token_expires_in?: number;
      scope?: string;
      error?: string;
    };

    if (!res.ok || !data.access_token || data.error) {
      console.debug("[github] OAuth refresh failed:", data.error ?? res.status);
      return args.accessToken;
    }

    const accessTokenExpiresAt =
      typeof data.expires_in === "number" ? new Date(Date.now() + data.expires_in * 1000) : null;
    const refreshTokenExpiresAt =
      typeof data.refresh_token_expires_in === "number"
        ? new Date(Date.now() + data.refresh_token_expires_in * 1000)
        : null;

    await betterAuthAccountRepository.updateGitHubTokens(args.accountId, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? args.refreshToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
      scope: data.scope ?? args.scope
    });

    return data.access_token;
  } catch (error) {
    console.debug("[github] OAuth refresh threw:", error);
    return args.accessToken;
  }
}

async function fetchGitHubLogin(token: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "tsu-stack"
      },
      signal: AbortSignal.timeout(GITHUB_HTTP_TIMEOUT_MS)
    });
    if (!res.ok) return null;
    const profile = (await res.json()) as { login?: string };
    const login = profile.login?.trim();
    return login && login.length > 0 ? login : null;
  } catch {
    return null;
  }
}
