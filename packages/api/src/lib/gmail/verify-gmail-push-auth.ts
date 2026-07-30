import { createRemoteJWKSet, jwtVerify } from "jose";

import { ENV_SERVER } from "@tsu-stack/env/server/env";

import { timingSafeStringEqual } from "#@/lib/agent/agent-fetch";

const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"] as const;

export type GmailPushAuthResult =
  | { ok: true; method: "oidc" | "shared_secret" }
  | { ok: false; reason: string };

function isProdEnv(): boolean {
  return ENV_SERVER.NODE_ENV === "production" || process.env.NODE_ENV === "production";
}

/**
 * Authenticate a Gmail Pub/Sub push request.
 *
 * Credentials (any one is enough when auth is required):
 * 1. Google OIDC JWT (Bearer) — preferred; set GMAIL_PUSH_OIDC_AUDIENCE
 * 2. Shared secret — GMAIL_PUSH_SHARED_SECRET as Bearer token
 *
 * Production: always requires a configured credential + valid token.
 * `GMAIL_PUSH_REQUIRE_AUTH=false` only enables open mode in non-production when no secrets are set.
 */
export async function verifyGmailPushAuth(
  authorizationHeader: string | null
): Promise<GmailPushAuthResult> {
  const sharedSecret =
    ENV_SERVER.GMAIL_PUSH_SHARED_SECRET?.trim() ??
    process.env.GMAIL_PUSH_SHARED_SECRET?.trim() ??
    "";
  const oidcAudience =
    ENV_SERVER.GMAIL_PUSH_OIDC_AUDIENCE?.trim() ??
    process.env.GMAIL_PUSH_OIDC_AUDIENCE?.trim() ??
    "";
  const oidcEmail = (
    ENV_SERVER.GMAIL_PUSH_OIDC_EMAIL?.trim() ??
    process.env.GMAIL_PUSH_OIDC_EMAIL?.trim() ??
    ""
  ).toLowerCase();

  const requireAuthEnv = (
    process.env.GMAIL_PUSH_REQUIRE_AUTH ??
    (ENV_SERVER.GMAIL_PUSH_REQUIRE_AUTH === true
      ? "true"
      : ENV_SERVER.GMAIL_PUSH_REQUIRE_AUTH === false
        ? "false"
        : "")
  )
    .toString()
    .trim()
    .toLowerCase();

  const hasCredential = Boolean(sharedSecret) || Boolean(oidcAudience);
  // Production is always closed. Dev may open only when explicitly opted out and no secrets.
  const allowOpenDev =
    !isProdEnv() && (requireAuthEnv === "false" || requireAuthEnv === "0") && !hasCredential;

  if (!hasCredential) {
    if (allowOpenDev) {
      return { ok: true, method: "shared_secret" }; // open_dev — keep union small for logs
    }
    return { ok: false, reason: "push_auth_not_configured" };
  }

  const auth = authorizationHeader?.trim() ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : auth;

  if (!token) {
    return { ok: false, reason: "missing_bearer" };
  }

  if (sharedSecret && timingSafeStringEqual(token, sharedSecret)) {
    return { ok: true, method: "shared_secret" };
  }

  if (oidcAudience) {
    try {
      const { payload } = await jwtVerify(token, GOOGLE_JWKS, {
        issuer: [...GOOGLE_ISSUERS],
        audience: oidcAudience
      });
      if (oidcEmail) {
        const email = typeof payload.email === "string" ? payload.email.toLowerCase() : "";
        const verified = payload.email_verified === true || payload.email_verified === "true";
        if (!verified || email !== oidcEmail) {
          return { ok: false, reason: "oidc_email_mismatch" };
        }
      }
      return { ok: true, method: "oidc" };
    } catch {
      // fall through
    }
  }

  return { ok: false, reason: "unauthorized" };
}
