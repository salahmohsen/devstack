/**
 * Short-lived invite cookie for OAuth preflight (and optional email sign-up).
 *
 * inviteCode must never become a `user` column — store it only in this cookie
 * (or pass it as a non-persisted body field on email sign-up).
 */

export const INVITE_COOKIE_NAME = "tsu_invite_code";

/** 15 minutes — enough for an OAuth round-trip. */
export const INVITE_COOKIE_MAX_AGE_SECONDS = 15 * 60;

export type InviteCookieWriteOptions = {
  /** Shared parent domain for cross-subdomain cookies (e.g. `.example.com`). */
  domain?: string;
  secure?: boolean;
  maxAgeSeconds?: number;
};

export function buildInviteCookieValue(code: string): string {
  return code.trim();
}

export function serializeInviteSetCookie(
  code: string,
  options: InviteCookieWriteOptions = {}
): string {
  const value = encodeURIComponent(buildInviteCookieValue(code));
  const maxAge = options.maxAgeSeconds ?? INVITE_COOKIE_MAX_AGE_SECONDS;
  const parts = [
    `${INVITE_COOKIE_NAME}=${value}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    "HttpOnly",
    "SameSite=Lax"
  ];
  if (options.secure !== false) {
    parts.push("Secure");
  }
  if (options.domain) {
    parts.push(`Domain=${options.domain}`);
  }
  return parts.join("; ");
}

export function serializeInviteClearCookie(options: InviteCookieWriteOptions = {}): string {
  const parts = [`${INVITE_COOKIE_NAME}=`, "Path=/", "Max-Age=0", "HttpOnly", "SameSite=Lax"];
  if (options.secure !== false) {
    parts.push("Secure");
  }
  if (options.domain) {
    parts.push(`Domain=${options.domain}`);
  }
  return parts.join("; ");
}

/** Read invite code from a Cookie header string or a getCookie helper. */
export function readInviteCodeFromCookieHeader(
  cookieHeader: string | null | undefined
): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    if (name !== INVITE_COOKIE_NAME) continue;
    const raw = part.slice(eq + 1).trim();
    try {
      const value = decodeURIComponent(raw).trim();
      return value.length > 0 ? value : null;
    } catch {
      return raw.trim() || null;
    }
  }
  return null;
}
