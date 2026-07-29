import { scopeListIncludesGmail } from "@tsu-stack/core";
import { betterAuthAccountRepository } from "@tsu-stack/db";
import { ENV_SERVER } from "@tsu-stack/env/server/env";

const EXPIRY_SKEW_MS = 60_000;

export type GoogleAccessResult =
  | { ok: true; accessToken: string; accountRowId: string }
  | { ok: false; code: "NOT_CONNECTED" | "NO_GMAIL_SCOPE" | "REFRESH_FAILED"; message: string };

/**
 * Return a valid Google access token for the user, refreshing if near expiry.
 */
export async function getGoogleAccessTokenForUser(userId: string): Promise<GoogleAccessResult> {
  const account = await betterAuthAccountRepository.findGoogleAccountForUser(userId);
  if (!account?.accessToken) {
    return {
      ok: false,
      code: "NOT_CONNECTED",
      message: "Connect Google under Settings → Connections first."
    };
  }
  if (!scopeListIncludesGmail(account.scope)) {
    return {
      ok: false,
      code: "NO_GMAIL_SCOPE",
      message: "Gmail scopes are missing. Use Connect Gmail under Settings → Connections."
    };
  }

  const expiresAt = account.accessTokenExpiresAt?.getTime() ?? 0;
  const stillValid = expiresAt === 0 || expiresAt > Date.now() + EXPIRY_SKEW_MS;
  if (stillValid) {
    return { ok: true, accessToken: account.accessToken, accountRowId: account.id };
  }

  if (!account.refreshToken) {
    return {
      ok: false,
      code: "REFRESH_FAILED",
      message:
        "Google token expired and no refresh token is stored. Disconnect and connect Gmail again."
    };
  }

  const clientId = ENV_SERVER.GOOGLE_CLIENT_ID;
  const clientSecret = ENV_SERVER.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return {
      ok: false,
      code: "REFRESH_FAILED",
      message: "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not configured."
    };
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: account.refreshToken
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return {
      ok: false,
      code: "REFRESH_FAILED",
      message: `Google token refresh failed (${res.status}): ${text.slice(0, 200)}`
    };
  }

  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
    scope?: string;
  };

  if (!json.access_token) {
    return {
      ok: false,
      code: "REFRESH_FAILED",
      message: "Google refresh response missing access_token."
    };
  }

  const accessTokenExpiresAt =
    typeof json.expires_in === "number" ? new Date(Date.now() + json.expires_in * 1000) : null;

  await betterAuthAccountRepository.updateProviderTokens(account.id, {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? account.refreshToken,
    accessTokenExpiresAt,
    scope: json.scope ?? account.scope
  });

  return { ok: true, accessToken: json.access_token, accountRowId: account.id };
}
