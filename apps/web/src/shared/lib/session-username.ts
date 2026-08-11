/**
 * Read public username from an auth session user object (Better Auth shape).
 * Avoids repeated casts at call sites.
 */
export function sessionUsernameFromUser(user: unknown): string | null {
  if (!user || typeof user !== "object") return null;
  const username = (user as { username?: unknown }).username;
  if (typeof username !== "string") return null;
  const trimmed = username.trim();
  return trimmed.length > 0 ? trimmed : null;
}
