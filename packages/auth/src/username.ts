import { USERNAME_MAX, USERNAME_MIN, parseUsername } from "@tsu-stack/core";
import { userRepository } from "@tsu-stack/db";

/**
 * Slugify display name / email local-part / GitHub login into a username candidate.
 * Does not guarantee uniqueness or final schema validity — use
 * {@link resolveUniqueUsername} for that.
 */
export function slugifyToUsernameCandidate(input: string): string {
  const slug = input
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036F]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .slice(0, USERNAME_MAX);

  return slug;
}

/** @deprecated Use slugifyToUsernameCandidate */
export const slugifyToProfileCandidate = slugifyToUsernameCandidate;

function throwUsernameTaken(message = "This username is already taken"): never {
  const err = new Error(message);
  (err as Error & { code?: string }).code = "USERNAME_TAKEN";
  throw err;
}

/**
 * Coerce a slug into a schema-valid base username (pad short, or random fallback).
 * Used for auto-generated candidates only — never for explicit user claims.
 */
function coerceAutoBase(raw: string): string {
  let base = raw;
  const baseParsed = parseUsername(base);
  if (baseParsed.success) {
    return baseParsed.data;
  }

  // Pad short path-safe slugs, or replace reserved / invalid with a random fallback.
  if (base.length > 0 && base.length < USERNAME_MIN && /^[a-z0-9-]+$/.test(base)) {
    base = `${base}${"x".repeat(USERNAME_MIN - base.length)}`;
  } else {
    base = `user-${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
  }

  const retry = parseUsername(base);
  if (retry.success) {
    return retry.data;
  }

  base = `usr-${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
  const finalBase = parseUsername(base);
  return finalBase.success ? finalBase.data : "usr-default";
}

/**
 * Produce a valid, unique username (public path handle).
 *
 * - Explicit claim (`username`): parse + fail if taken (never silent-rename).
 * - Auto path: `githubLogin` slug → `name` → email local-part → `user-{uuid}`;
 *   if invalid/reserved/taken, auto-suffix `-2`, `-3`, … (decision A).
 */
export async function resolveUniqueUsername(input: {
  username?: string | null;
  githubLogin?: string | null;
  name?: string | null;
  email?: string | null;
}): Promise<string> {
  const explicit = input.username?.trim();
  if (explicit) {
    const parsed = parseUsername(explicit);
    if (!parsed.success) {
      throw parsed.error;
    }
    if (await userRepository.isUsernameTaken(parsed.data)) {
      throwUsernameTaken();
    }
    return parsed.data;
  }

  const fromGithub = input.githubLogin ? slugifyToUsernameCandidate(input.githubLogin) : "";
  const fromName = input.name ? slugifyToUsernameCandidate(input.name) : "";
  const fromEmail = input.email ? slugifyToUsernameCandidate(input.email.split("@")[0] ?? "") : "";

  const base = coerceAutoBase(fromGithub || fromName || fromEmail || "user");

  let candidate = base;
  // Decision A: first collision → base-2, then -3, … (GitHub-style).
  let n = 1;
  while (await userRepository.isUsernameTaken(candidate)) {
    n += 1;
    const suffix = `-${n}`;
    const truncated = base.slice(0, Math.max(USERNAME_MIN, USERNAME_MAX - suffix.length));
    candidate = `${truncated}${suffix}`;
    const parsed = parseUsername(candidate);
    if (!parsed.success) {
      candidate = `user-${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
    } else {
      candidate = parsed.data;
    }
    if (n > 50) {
      candidate = `user-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
      break;
    }
  }

  return candidate;
}

/** @deprecated Use resolveUniqueUsername */
export async function resolveUniqueProfileName(input: {
  profileName?: string | null;
  username?: string | null;
  githubLogin?: string | null;
  name?: string | null;
  email?: string | null;
}): Promise<string> {
  return resolveUniqueUsername({
    username: input.username ?? input.profileName,
    githubLogin: input.githubLogin,
    name: input.name,
    email: input.email
  });
}
