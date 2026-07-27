import { PROFILE_NAME_MAX, PROFILE_NAME_MIN, parseProfileName } from "@tsu-stack/core";
import { userRepository } from "@tsu-stack/db";

/**
 * Slugify display name / email local-part into a profile-name candidate.
 * Does not guarantee uniqueness or final schema validity — use
 * {@link resolveUniqueProfileName} for that.
 */
export function slugifyToProfileCandidate(input: string): string {
  const slug = input
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036F]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .slice(0, PROFILE_NAME_MAX);

  return slug;
}

/**
 * Produce a valid, unique profileName.
 * Prefer an explicit candidate (email sign-up); otherwise slugify name/email.
 */
export async function resolveUniqueProfileName(input: {
  profileName?: string | null;
  name?: string | null;
  email?: string | null;
}): Promise<string> {
  const explicit = input.profileName?.trim();
  if (explicit) {
    const parsed = parseProfileName(explicit);
    if (!parsed.success) {
      throw parsed.error;
    }
    if (await userRepository.isProfileNameTaken(parsed.data)) {
      // Explicit claim is taken — fail rather than silently rename the user's choice.
      const err = new Error("This profile name is already taken");
      (err as Error & { code?: string }).code = "PROFILE_NAME_TAKEN";
      throw err;
    }
    return parsed.data;
  }

  const fromName = input.name ? slugifyToProfileCandidate(input.name) : "";
  const fromEmail = input.email ? slugifyToProfileCandidate(input.email.split("@")[0] ?? "") : "";

  let base = fromName || fromEmail || "user";
  const baseParsed = parseProfileName(base);
  if (!baseParsed.success) {
    // Pad short slugs or replace reserved / invalid with a random fallback.
    if (base.length > 0 && base.length < PROFILE_NAME_MIN && /^[a-z0-9-]+$/.test(base)) {
      base = `${base}${"x".repeat(PROFILE_NAME_MIN - base.length)}`;
    } else {
      base = `user-${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
    }
    const retry = parseProfileName(base);
    if (!retry.success) {
      base = `usr-${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
    } else {
      base = retry.data;
    }
    const finalBase = parseProfileName(base);
    base = finalBase.success ? finalBase.data : "usr-default";
  } else {
    base = baseParsed.data;
  }

  let candidate = base;
  let n = 0;
  while (await userRepository.isProfileNameTaken(candidate)) {
    n += 1;
    const suffix = `-${n}`;
    const truncated = base.slice(0, Math.max(PROFILE_NAME_MIN, PROFILE_NAME_MAX - suffix.length));
    candidate = `${truncated}${suffix}`;
    const parsed = parseProfileName(candidate);
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
