import { createRemoteJWKSet, jwtVerify } from "jose";

import { ENV_SERVER } from "@tsu-stack/env/server/env";

import { timingSafeStringEqual } from "#@/lib/agent/agent-fetch";

const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"] as const;

export type GmailPushAuthResult =
  | { ok: true; method: "oidc" | "shared_secret" }
  | { ok: false; reason: string };

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Authenticate a Gmail Pub/Sub push request.
 *
 * Credentials (any one is enough when auth is required):
 * 1. Google OIDC JWT (Bearer) — preferred; set GMAIL_PUSH_OIDC_AUDIENCE
 * 2. Shared secret — GMAIL_PUSH_SHARED_SECRET as Bearer token
 *
 * Production: refuses when no credentials configured (unless REQUIRE_AUTH=false).
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
  const requireAuth =
    requireAuthEnv === "true" ||
    requireAuthEnv === "1" ||
    (isProduction() && requireAuthEnv !== "false");

  if (requireAuth && !hasCredential) {
    return { ok: false, reason: "push_auth_not_configured" };
  }

  if (!requireAuth && !hasCredential) {
    // Dev open mode only when auth is explicitly not required and no secrets set.
    return { ok: true, method: "shared_secret" }; // open_dev — keep union small for logs
  }

  // Never allow REQUIRE_AUTH=false to open prod when credentials exist but token is wrong.
  // (requireAuth already true in production by default.)

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
        const email = String(payload.email ?? "").toLowerCase();
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
