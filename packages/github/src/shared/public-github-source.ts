import {
  betterAuthAccountRepository,
  githubConfigRepository,
  type GitHubAccountTokens
} from "@tsu-stack/db/repositories";
import { ENV_SERVER } from "@tsu-stack/env/server/env";

export type PublicGitHubSource =
  | {
      isConfigured: false;
      reason: "missing_github_configuration" | "github_token_invalid";
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
/** Don't cache hard auth failures for long — user may re-link immediately. */
const SOURCE_CACHE_FAIL_TTL_MS = 5_000;

const cachedByUserId = new Map<string, { value: PublicGitHubSource; expiresAt: number }>();
const inflightByUserId = new Map<string, Promise<PublicGitHubSource>>();
/**
 * Per-account refresh mutex. A single process-global promise would cross-wire
 * concurrent users refreshing different GitHub accounts.
 */
const inflightRefreshByAccountId = new Map<string, Promise<string | null>>();

/**
 * Resolve GitHub credentials for a **specific app user** (tenant).
 *
 * Tokens come from Better Auth's GitHub `account` row (OAuth), with refresh
 * when expired **or** when GitHub rejects the access token (revoked / Bad credentials).
 * Never uses a global "first configured" owner.
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
      const ttl = value.isConfigured ? SOURCE_CACHE_TTL_MS : SOURCE_CACHE_FAIL_TTL_MS;
      cachedByUserId.set(userId, { value, expiresAt: Date.now() + ttl });
      return value;
    })
    .finally(() => {
      inflightByUserId.delete(userId);
    });

  inflightByUserId.set(userId, promise);
  return promise;
}

/** Drop cache (e.g. after sign-in / config change / Bad credentials). */
export function invalidatePublicGitHubSourceCache(userId?: string): void {
  if (userId) {
    cachedByUserId.delete(userId);
    return;
  }
  cachedByUserId.clear();
}

/**
 * Lightweight probe: returns GitHub login if the token works, else null.
 * Used by context live-OAuth fallback so we never trust an unvalidated token.
 */
export async function validateGitHubAccessToken(token: string): Promise<string | null> {
  return fetchGitHubLogin(token);
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

  const resolved = await resolveWorkingGitHubAccessToken(githubAccount);
  if (resolved.token === null) {
    return {
      isConfigured: false,
      reason:
        resolved.reason === "invalid" ? "github_token_invalid" : "missing_github_configuration"
    };
  }

  const { token, login: loginFromValidation } = resolved;

  const ownerFromConfig = settings?.githubUsername?.trim();
  // Prefer stored username when present; validation already proved the token works.
  const owner =
    (ownerFromConfig && ownerFromConfig.length > 0 ? ownerFromConfig : null) ??
    loginFromValidation ??
    null;

  if (!owner) {
    return {
      isConfigured: false,
      reason: "github_token_invalid"
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

export type WorkingTokenResolve =
  | { token: string; login: string }
  | { token: null; reason: "missing" | "invalid" };

export type WorkingTokenDeps = {
  fetchUserLogin: (token: string) => Promise<string | null>;
  refreshAccessToken: (args: RefreshAccessTokenArgs) => Promise<string | null>;
  getClientCredentials: () => {
    clientId: string | undefined;
    clientSecret: string | undefined;
  };
};

export type RefreshAccessTokenArgs = {
  accountId: string;
  accessToken: string | null;
  refreshToken: string;
  scope: string | null | undefined;
  clientId: string;
  clientSecret: string;
};

const defaultWorkingTokenDeps: WorkingTokenDeps = {
  fetchUserLogin: fetchGitHubLogin,
  refreshAccessToken: refreshAccessTokenHttp,
  getClientCredentials: () => {
    return {
      clientId: ENV_SERVER.GITHUB_CLIENT_ID,
      clientSecret: ENV_SERVER.GITHUB_CLIENT_SECRET
    };
  }
};

/**
 * Return a **working** access token (exported for unit tests with injectable deps).
 * - Refresh when near expiry or missing access token
 * - Always validate with GET /user
 * - On validation failure (revoked / Bad credentials), force-refresh once if possible
 */
export async function resolveWorkingGitHubAccessToken(
  row: GitHubAccountTokens,
  deps: WorkingTokenDeps = defaultWorkingTokenDeps
): Promise<WorkingTokenResolve> {
  const accessTokenRaw = row.accessToken?.trim();
  const refreshTokenRaw = row.refreshToken?.trim();
  let accessToken = accessTokenRaw && accessTokenRaw.length > 0 ? accessTokenRaw : null;
  const refreshToken = refreshTokenRaw && refreshTokenRaw.length > 0 ? refreshTokenRaw : null;

  const expiresAt = row.accessTokenExpiresAt ? new Date(row.accessTokenExpiresAt).getTime() : null;
  const knownExpired = expiresAt != null && expiresAt - Date.now() < ACCESS_TOKEN_SKEW_MS;

  const { clientId, clientSecret } = deps.getClientCredentials();
  const canRefresh = Boolean(refreshToken && clientId && clientSecret);

  // Proactive refresh when we know the token is expired/near-expiry.
  if (canRefresh && (!accessToken || knownExpired)) {
    accessToken = await runRefresh(
      {
        accountId: row.id,
        accessToken,
        refreshToken: refreshToken!,
        scope: row.scope,
        clientId: clientId!,
        clientSecret: clientSecret!
      },
      deps
    );
  }

  if (!accessToken) {
    return { token: null, reason: "missing" };
  }

  // Prove the token works (catches revoked tokens that still look "unexpired").
  let login = await deps.fetchUserLogin(accessToken);
  if (login) {
    return { token: accessToken, login };
  }

  // Force refresh once on Bad credentials / 401 even when expiresAt says still valid.
  if (!canRefresh) {
    return { token: null, reason: "invalid" };
  }

  const refreshed = await runRefresh(
    {
      accountId: row.id,
      accessToken,
      refreshToken: refreshToken!,
      scope: row.scope,
      clientId: clientId!,
      clientSecret: clientSecret!
    },
    deps
  );

  if (!refreshed) {
    return { token: null, reason: "invalid" };
  }

  login = await deps.fetchUserLogin(refreshed);
  if (login) {
    return { token: refreshed, login };
  }

  return { token: null, reason: "invalid" };
}

async function runRefresh(
  args: RefreshAccessTokenArgs,
  deps: WorkingTokenDeps
): Promise<string | null> {
  const existing = inflightRefreshByAccountId.get(args.accountId);
  if (existing) {
    return existing;
  }

  const promise = deps.refreshAccessToken(args).finally(() => {
    inflightRefreshByAccountId.delete(args.accountId);
  });
  inflightRefreshByAccountId.set(args.accountId, promise);
  return promise;
}

async function refreshAccessTokenHttp(args: RefreshAccessTokenArgs): Promise<string | null> {
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
      // Do not keep returning a known-bad access token after a failed refresh.
      return null;
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
    return null;
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
