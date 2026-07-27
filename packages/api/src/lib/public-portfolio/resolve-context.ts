import {
  normalizeHostname,
  parseProfileName,
  type PublicPortfolioContextOutput
} from "@tsu-stack/core";
import {
  profileSlugAliasRepository,
  userCustomDomainRepository,
  userRepository
} from "@tsu-stack/db";

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

export type ResolvePublicPortfolioContextInput = {
  /** Request Host (may include port); normalized before lookup. */
  host?: string | null;
  /** Path segment `/:profileName` when present. */
  pathProfileName?: string | null;
};

/**
 * Public portfolio identity resolution.
 *
 * Order:
 * 1. Host matches a **verified** custom domain → that user, mode `custom_domain`
 * 2. Else path profileName / slug alias → that user, mode `path`
 * 3. Else null (community landing / 404)
 */
export async function resolvePublicPortfolioContext(
  input: ResolvePublicPortfolioContextInput
): Promise<PublicPortfolioContextOutput | null> {
  const host = input.host ? normalizeHostname(input.host) : "";

  if (host) {
    const domain = await userCustomDomainRepository.findVerifiedByHostname(host);
    if (domain) {
      const user = await userRepository.findById(domain.userId);
      if (user?.profileName) {
        return {
          userId: user.id,
          profileName: user.profileName,
          mode: "custom_domain"
        };
      }
    }
  }

  const pathProfileName = input.pathProfileName?.trim();
  if (pathProfileName) {
    const userId = await resolveUserIdByProfileName(pathProfileName);
    if (userId) {
      const user = await userRepository.findById(userId);
      if (user?.profileName) {
        return {
          userId: user.id,
          profileName: user.profileName,
          mode: "path"
        };
      }
    }
  }

  return null;
}
