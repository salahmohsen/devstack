import { useRouterState } from "@tanstack/react-router";
import { useMemo } from "react";

import { isCustomDomainHost } from "@/shared/lib/primary-app-url";
import {
  repoOverviewPath as repoOverviewPathRaw,
  reposListPath as reposListPathRaw
} from "@/shared/lib/repo-paths";

export type PublicSurfaceMode = "path" | "custom_domain";

/**
 * Public portfolio Host/path mode for building in-app public URLs.
 * - path: primary host `/{tenantUsername}/…`
 * - custom_domain: portfolio at `/`, repos at `/repos/…` (no profile segment)
 *
 * **Rule:** never emit `/{username}/…` when Host is a verified custom domain.
 */
export type PublicSurface = {
  mode: PublicSurfaceMode;
  /** Path-builder slug; null on custom domain. */
  username: string | null;
  /** Always the tenant public slug (owner checks, data loaders). */
  tenantUsername: string;
};

export function createPublicSurface(input: {
  tenantUsername: string;
  mode: PublicSurfaceMode;
}): PublicSurface {
  const tenantUsername = input.tenantUsername.trim();
  return {
    mode: input.mode,
    tenantUsername,
    username: input.mode === "path" ? tenantUsername : null
  };
}

/** Infer surface from hostname + known tenant slug. */
export function resolvePublicSurface(input: {
  tenantUsername: string;
  hostname?: string | null;
}): PublicSurface {
  const mode: PublicSurfaceMode = isCustomDomainHost(input.hostname) ? "custom_domain" : "path";
  return createPublicSurface({ tenantUsername: input.tenantUsername, mode });
}

/**
 * Client hook: surface for the current Host + tenant.
 * Prefer this over hard-coding `/$username/…` on public chrome.
 * Re-renders on navigation so Host-scoped mode stays correct after client route changes.
 */
export function usePublicSurface(tenantUsername: string): PublicSurface {
  // Subscribe to location so we recompute after hydration / client navigations.
  const href = useRouterState({ select: (s) => s.location.href });
  return useMemo(() => {
    let hostname: string | null = null;
    if (typeof window !== "undefined") {
      try {
        hostname = new URL(href, window.location.origin).hostname || null;
      } catch {
        hostname = window.location.hostname || null;
      }
    }
    return resolvePublicSurface({ tenantUsername, hostname });
  }, [tenantUsername, href]);
}

/** Explicit mode from route loaders (custom-domain `/repos` vs path `/$username/repos`). */
export function surfaceFromRouteMode(
  tenantUsername: string,
  mode: PublicSurfaceMode
): PublicSurface {
  return createPublicSurface({ tenantUsername, mode });
}

export function portfolioHomePath(surface: PublicSurface): string {
  if (surface.mode === "custom_domain" || !surface.username) return "/";
  return `/${surface.username}`;
}

export function publicReposListPath(surface: PublicSurface): string {
  return reposListPathRaw(surface.username);
}

export function publicRepoOverviewPath(surface: PublicSurface, repo: string): string {
  return repoOverviewPathRaw(surface.username, repo);
}

/**
 * Typed Link target for in-app repo overview (path vs custom-domain file routes).
 */
export function publicRepoOverviewLocation(
  surface: PublicSurface,
  repo: string
):
  | { to: "/$username/repos/$repo"; params: { username: string; repo: string } }
  | { to: "/repos/$repo"; params: { repo: string } } {
  if (surface.username) {
    return {
      to: "/$username/repos/$repo",
      params: { username: surface.username, repo }
    };
  }
  return { to: "/repos/$repo", params: { repo } };
}

export function publicPortfolioHomeLocation(
  surface: PublicSurface
): { to: "/$username"; params: { username: string } } | { to: "/" } {
  if (surface.username) {
    return { to: "/$username", params: { username: surface.username } };
  }
  return { to: "/" };
}

export function publicReposListLocation(
  surface: PublicSurface
): { to: "/$username/repos"; params: { username: string } } | { to: "/repos" } {
  if (surface.username) {
    return { to: "/$username/repos", params: { username: surface.username } };
  }
  return { to: "/repos" };
}
