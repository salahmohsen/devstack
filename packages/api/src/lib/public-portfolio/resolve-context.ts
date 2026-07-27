import { parseProfileName } from "@tsu-stack/core";
import { profileSlugAliasRepository, userRepository } from "@tsu-stack/db";

/**
 * Resolve a public profile path segment to a user id.
 *
 * Order: normalize + validate → live `user.profileName` → `profile_slug_alias.slug`.
 * Returns null for reserved paths, invalid format, or unknown slugs.
 */
export async function resolveUserIdByProfileName(profileName: string): Promise<string | null> {
  const parsed = parseProfileName(profileName);
  if (!parsed.success) {
    return null;
  }

  const slug = parsed.data;

  const user = await userRepository.findByProfileName(slug);
  if (user) {
    return user.id;
  }

  const alias = await profileSlugAliasRepository.findBySlug(slug);
  return alias?.userId ?? null;
}
