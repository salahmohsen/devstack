/**
 * Read public profileName from an auth session user object (Better Auth shape).
 * Avoids repeated casts at call sites.
 */
export function sessionProfileNameFromUser(user: unknown): string | null {
  if (!user || typeof user !== "object") return null;
  const profileName = (user as { profileName?: unknown }).profileName;
  if (typeof profileName !== "string") return null;
  const trimmed = profileName.trim();
  return trimmed.length > 0 ? trimmed : null;
}
