import { isCustomDomainHost } from "@/shared/lib/primary-app-url";
import {
  repoOverviewPath as repoOverviewPathRaw,
  reposListPath as reposListPathRaw
} from "@/shared/lib/repo-paths";

export type PublicSurfaceMode = "path" | "custom_domain";

/**
 * Public portfolio Host/path mode for building in-app public URLs.
 * - path: primary host `/{tenantProfileName}/…`
 * - custom_domain: portfolio at `/`, repos at `/repos/…` (no profile segment)
 */
export type PublicSurface = {
  mode: PublicSurfaceMode;
  /** Path-builder slug; null on custom domain. */
  profileName: string | null;
  /** Always the tenant public slug (owner checks, data loaders). */
  tenantProfileName: string;
};

export function createPublicSurface(input: {
  tenantProfileName: string;
  mode: PublicSurfaceMode;
}): PublicSurface {
  const tenantProfileName = input.tenantProfileName.trim();
  return {
    mode: input.mode,
    tenantProfileName,
    profileName: input.mode === "path" ? tenantProfileName : null
  };
}

/** Infer surface from browser/SSR hostname + known tenant slug. */
export function resolvePublicSurface(input: {
  tenantProfileName: string;
  hostname?: string | null;
}): PublicSurface {
  const mode: PublicSurfaceMode = isCustomDomainHost(input.hostname) ? "custom_domain" : "path";
  return createPublicSurface({ tenantProfileName: input.tenantProfileName, mode });
}

export function portfolioHomePath(surface: PublicSurface): string {
  if (surface.mode === "custom_domain" || !surface.profileName) return "/";
  return `/${surface.profileName}`;
}

export function publicReposListPath(surface: PublicSurface): string {
  return reposListPathRaw(surface.profileName);
}

export function publicRepoOverviewPath(surface: PublicSurface, repo: string): string {
  return repoOverviewPathRaw(surface.profileName, repo);
}

/**
 * Typed Link target for in-app repo overview (path vs custom-domain file routes).
 */
export function publicRepoOverviewLocation(
  surface: PublicSurface,
  repo: string
):
  | { to: "/$profileName/repos/$repo"; params: { profileName: string; repo: string } }
  | { to: "/repos/$repo"; params: { repo: string } } {
  if (surface.profileName) {
    return {
      to: "/$profileName/repos/$repo",
      params: { profileName: surface.profileName, repo }
    };
  }
  return { to: "/repos/$repo", params: { repo } };
}

export function publicPortfolioHomeLocation(
  surface: PublicSurface
): { to: "/$profileName"; params: { profileName: string } } | { to: "/" } {
  if (surface.profileName) {
    return { to: "/$profileName", params: { profileName: surface.profileName } };
  }
  return { to: "/" };
}

export function publicReposListLocation(
  surface: PublicSurface
): { to: "/$profileName/repos"; params: { profileName: string } } | { to: "/repos" } {
  if (surface.profileName) {
    return { to: "/$profileName/repos", params: { profileName: surface.profileName } };
  }
  return { to: "/repos" };
}
