/**
 * Pure invite-code resolution for sign-up / OAuth preflight.
 *
 * inviteCode must never become a `user` column — sources are body, short-lived
 * cookie, or OAuth state only.
 */

import { INVITE_COOKIE_NAME, readInviteCodeFromCookieHeader } from "./invite-cookie";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Read a non-empty trimmed string field from an unknown object. */
export function readStringField(source: unknown, key: string): string | null {
  if (!isRecord(source)) return null;
  const value = source[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export type InviteCodeSources = {
  /** Email sign-up body (or similar). Prefer `inviteCode` field. */
  body?: unknown;
  /** Better Auth getCookie helper when available. */
  getCookie?: (name: string) => string | null | undefined;
  /** Raw Cookie header fallback. */
  cookieHeader?: string | null;
  /**
   * Invite code already read from OAuth state (`additionalData.inviteCode`).
   * Pass null/omit when outside an OAuth callback.
   */
  oauthStateInviteCode?: string | null;
};

/**
 * Invite code sources (never a user column), in priority order:
 * 1. Body field `inviteCode`
 * 2. Short-lived `tsu_invite_code` cookie (getCookie, then Cookie header)
 * 3. OAuth state invite code
 *
 * Returns null when all sources are missing (fail-closed for gated signup).
 */
export function extractInviteCodeFromSources(input: InviteCodeSources): string | null {
  const fromBody = readStringField(input.body, "inviteCode");
  if (fromBody) return fromBody;

  if (typeof input.getCookie === "function") {
    const fromGetCookie = input.getCookie(INVITE_COOKIE_NAME);
    if (fromGetCookie?.trim()) return fromGetCookie.trim();
  }

  const fromHeader = readInviteCodeFromCookieHeader(input.cookieHeader);
  if (fromHeader) return fromHeader;

  const fromState = input.oauthStateInviteCode?.trim();
  if (fromState) return fromState;

  return null;
}
