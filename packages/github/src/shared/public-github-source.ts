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
    };

const GITHUB_TOKEN_ENDPOINT = "https://github.com/login/oauth/access_token";
const ACCESS_TOKEN_SKEW_MS = 5_000;

/**
 * Resolve the portfolio owner's GitHub credentials for **server-side** use.
 *
 * Tokens come from Better Auth's GitHub `account` row (OAuth), with refresh
 * when expired. The classic PAT on `github_config` is no longer used.
 *
 * The token never leaves the server — public HTTP handlers only return
 * already-fetched public data shapes.
 */
export async function resolvePublicGitHubSource(): Promise<PublicGitHubSource> {
  const settings = await githubConfigRepository.findPublicGithubSourceSettings();
  const githubAccount =
    (settings?.userId
      ? await betterAuthAccountRepository.findGitHubAccountForUser(settings.userId)
      : null) ?? (await betterAuthAccountRepository.findAnyGitHubAccount());

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
  const ownerFromLogin = await fetchGitHubLogin(token);
  const owner =
    (ownerFromConfig && ownerFromConfig.length > 0 ? ownerFromConfig : null) ??
    ownerFromLogin ??
    "owner";

  // Keep username in github_config for ownerProcedure identity without storing a PAT.
  if (settings?.userId && owner && owner !== settings.githubUsername) {
    await githubConfigRepository.upsertUsername(settings.userId, owner).catch(() => undefined);
  } else if (!settings && githubAccount.userId && owner) {
    await githubConfigRepository.upsertUsername(githubAccount.userId, owner).catch(() => undefined);
  }

  return {
    isConfigured: true,
    owner,
    token
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
  const needsRefresh =
    Boolean(refreshToken) &&
    (expiresAt == null || expiresAt - Date.now() < ACCESS_TOKEN_SKEW_MS || !accessToken);

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

  try {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken
    });

    const res = await fetch(GITHUB_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "tsu-stack"
      },
      body
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
      return accessToken;
    }

    const accessTokenExpiresAt =
      typeof data.expires_in === "number" ? new Date(Date.now() + data.expires_in * 1000) : null;
    const refreshTokenExpiresAt =
      typeof data.refresh_token_expires_in === "number"
        ? new Date(Date.now() + data.refresh_token_expires_in * 1000)
        : null;

    await betterAuthAccountRepository.updateGitHubTokens(row.id, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
      scope: data.scope ?? row.scope
    });

    return data.access_token;
  } catch (error) {
    console.debug("[github] OAuth refresh threw:", error);
    return accessToken;
  }
}

async function fetchGitHubLogin(token: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "tsu-stack"
      }
    });
    if (!res.ok) return null;
    const profile = (await res.json()) as { login?: string };
    const login = profile.login?.trim();
    return login && login.length > 0 ? login : null;
  } catch {
    return null;
  }
}
