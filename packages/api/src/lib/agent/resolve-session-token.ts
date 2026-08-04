import { randomBytes, randomUUID } from "node:crypto";

import { and, desc, eq, gt } from "drizzle-orm";

import { db } from "@tsu-stack/db";
import { session as sessionTable } from "@tsu-stack/db/schema";

/** Queue-minted sessions live 30 days. */
const QUEUE_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Raw session token for Mastra `MastraAuthBetterAuth` Bearer auth.
 * Prefer the live request token; fall back to latest non-expired DB session (queues).
 */
export function extractSessionTokenFromHeaders(headers: Headers): string | null {
  const auth = headers.get("authorization") ?? headers.get("Authorization");
  if (auth) {
    const trimmed = auth.trim();
    if (trimmed.toLowerCase().startsWith("bearer ")) {
      const token = trimmed.slice(7).trim();
      if (token.length > 0) return token;
    }
  }

  const cookie = headers.get("cookie") ?? headers.get("Cookie");
  if (!cookie) return null;

  // Better Auth default cookie (optional __Secure- prefix in production).
  const match = cookie.match(/(?:^|;\s*)(?:__Secure-)?better-auth\.session_token=([^;]+)/i);
  if (!match?.[1]) return null;

  try {
    const raw = decodeURIComponent(match[1].trim());
    // Cookie value is often `token.signature` — Mastra/Better Auth accept signed or raw.
    return raw.length > 0 ? raw : null;
  } catch {
    return match[1].trim() || null;
  }
}

/** Latest valid session.token for a user (read-only; does not mint). */
export async function resolveSessionTokenForUser(userId: string): Promise<string | null> {
  const now = new Date();
  const rows = await db
    .select({ token: sessionTable.token })
    .from(sessionTable)
    .where(and(eq(sessionTable.userId, userId), gt(sessionTable.expiresAt, now)))
    .orderBy(desc(sessionTable.updatedAt))
    .limit(1);

  const token = rows[0]?.token?.trim();
  return token && token.length > 0 ? token : null;
}

/**
 * Ensure a usable Better Auth session token for background agent calls.
 * Reuses the latest non-expired session when present; otherwise inserts a
 * queue-owned session row (userAgent `personal-hub-queue`, 30-day TTL).
 *
 * Prefer this over {@link resolveSessionTokenForUser} in queues / agent callers
 * so jobs do not fail closed with `no_session`.
 */
export async function ensureSessionTokenForUser(userId: string): Promise<string> {
  const existing = await resolveSessionTokenForUser(userId);
  if (existing) return existing;

  const now = new Date();
  const token = randomBytes(32).toString("base64url");

  await db.insert(sessionTable).values({
    id: randomUUID(),
    token,
    userId,
    expiresAt: new Date(now.getTime() + QUEUE_SESSION_TTL_MS),
    createdAt: now,
    updatedAt: now,
    ipAddress: null,
    userAgent: "personal-hub-queue"
  });

  return token;
}

/**
 * Prefer request cookie/Bearer; else existing DB session for userId.
 * Returns null when the user has no active session (caller should fail closed).
 *
 * For queues / background agent workflows, use {@link ensureSessionTokenForUser}
 * instead — this helper never mints sessions.
 */
export async function resolveAgentSessionToken(input: {
  headers?: Headers | null;
  userId?: string | null;
  /** When getSession already returned a token-bearing session object. */
  sessionToken?: string | null;
}): Promise<string | null> {
  const fromSession = input.sessionToken?.trim();
  if (fromSession) return fromSession;

  if (input.headers) {
    const fromHeaders = extractSessionTokenFromHeaders(input.headers);
    if (fromHeaders) return fromHeaders;
  }

  if (input.userId?.trim()) {
    return resolveSessionTokenForUser(input.userId.trim());
  }

  return null;
}
