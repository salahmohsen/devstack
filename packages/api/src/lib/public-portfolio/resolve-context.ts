import {
  normalizeHostname,
  parseUsername,
  type PublicPortfolioContextOutput
} from "@tsu-stack/core";
import {
  usernameSlugAliasRepository,
  userCustomDomainRepository,
  userRepository
} from "@tsu-stack/db";

/**
 * Resolve a public username path segment to a user id.
 *
 * Order: normalize + validate → live `user.username` → `username_slug_alias.slug`.
 * Returns null for reserved paths, invalid format, or unknown slugs.
 */
export async function resolveUserIdByUsername(username: string): Promise<string | null> {
  const parsed = parseUsername(username);
  if (!parsed.success) {
    return null;
  }

  const slug = parsed.data;

  const user = await userRepository.findByUsername(slug);
  if (user) {
    return user.id;
  }

  const alias = await usernameSlugAliasRepository.findBySlug(slug);
  return alias?.userId ?? null;
}

/** @deprecated Use resolveUserIdByUsername */
export const resolveUserIdByProfileName = resolveUserIdByUsername;

export type ResolvePublicPortfolioContextInput = {
  /** Request Host (may include port); normalized before lookup. */
  host?: string | null;
  /** Path segment `/:username` when present. */
  pathUsername?: string | null;
  /**
   * @deprecated Use pathUsername
   */
  pathProfileName?: string | null;
  /**
   * Authenticated user id. Used only when Host/path do not resolve a public
   * identity (dashboard chrome calling portfolio.list without a public slug).
   * Never overrides an explicit path username — wrong slugs still 404.
   */
  sessionUserId?: string | null;
};

/**
 * Public portfolio identity resolution.
 *
 * Order:
 * 1. Host matches a **verified** custom domain → that user, mode `custom_domain`
 * 2. Else path username / slug alias → that user, mode `path`
 * 3. Else session user (no path/host match) → that user, mode `path`
 * 4. Else null (community landing / 404)
 */
export async function resolvePublicPortfolioContext(
  input: ResolvePublicPortfolioContextInput
): Promise<PublicPortfolioContextOutput | null> {
  const host = input.host ? normalizeHostname(input.host) : "";

  if (host) {
    const domain = await userCustomDomainRepository.findVerifiedByHostname(host);
    if (domain) {
      const user = await userRepository.findById(domain.userId);
      if (user?.username) {
        return {
          userId: user.id,
          username: user.username,
          mode: "custom_domain"
        };
      }
    }
  }

  const pathUsername = (input.pathUsername ?? input.pathProfileName)?.trim();
  if (pathUsername) {
    const userId = await resolveUserIdByUsername(pathUsername);
    if (userId) {
      const user = await userRepository.findById(userId);
      if (user?.username) {
        return {
          userId: user.id,
          username: user.username,
          mode: "path"
        };
      }
    }
    // Explicit slug that does not resolve stays not-found (do not fall back to session).
    return null;
  }

  const sessionUserId = input.sessionUserId?.trim();
  if (sessionUserId) {
    const user = await userRepository.findById(sessionUserId);
    if (user?.username) {
      return {
        userId: user.id,
        username: user.username,
        mode: "path"
      };
    }
  }

  return null;
}
