import { isCustomDomainHost } from "@/shared/lib/primary-app-url";
import {
  createPublicSurface,
  resolvePublicSurface,
  type PublicSurface
} from "@/shared/lib/public-surface";

export type PublicScopeNavActive = "profile" | "repos" | "dashboard" | null;

export type PublicScopeNavResult = {
  show: boolean;
  surface: PublicSurface | null;
  active: PublicScopeNavActive;
  /**
   * When true, render the Dashboard chip (signed-in only).
   * Profile/Repos links still need `surface`.
   */
  showDashboard: boolean;
};

/** Paths that never host public portfolio scope nav (except dashboard when signed in). */
const HIDDEN_PREFIXES = [
  "/sign-in",
  "/sign-up",
  "/playground",
  "/privacy-policy",
  "/terms-of-service"
] as const;

function isDashboardPath(pathname: string): boolean {
  const path = normalizePath(pathname);
  return path === "/dashboard" || path.startsWith("/dashboard/");
}

/** First path segment reserved (not a username). */
const RESERVED_SEGMENTS = new Set([
  "dashboard",
  "sign-in",
  "sign-up",
  "repos",
  "playground",
  "privacy-policy",
  "terms-of-service",
  "api",
  "docs",
  "media"
]);

export function isScopeNavHiddenPath(pathname: string): boolean {
  const path = normalizePath(pathname);
  if (path === "/") return false;
  return HIDDEN_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

function normalizePath(pathname: string): string {
  if (!pathname) return "/";
  const trimmed = pathname.split("?")[0] ?? pathname;
  if (trimmed.length > 1 && trimmed.endsWith("/")) return trimmed.slice(0, -1);
  return trimmed || "/";
}

/**
 * Extract username from path routes: `/{username}` or `/{username}/repos…`.
 * Returns null on custom-domain-style `/repos…` or reserved segments.
 */
export function pathUsernameFromPathname(pathname: string): string | null {
  const path = normalizePath(pathname);
  if (path === "/" || path === "/repos" || path.startsWith("/repos/")) return null;
  const m = path.match(/^\/([^/]+)(?:\/|$)/);
  if (!m?.[1]) return null;
  const seg = m[1];
  if (RESERVED_SEGMENTS.has(seg)) return null;
  return seg;
}

export function activeScopeFromPathname(
  pathname: string,
  surface: PublicSurface
): PublicScopeNavActive {
  const path = normalizePath(pathname);

  if (isDashboardPath(path)) return "dashboard";

  if (surface.mode === "custom_domain") {
    if (path === "/" || path === "") return "profile";
    if (path === "/repos" || path.startsWith("/repos/")) return "repos";
    return null;
  }

  const p = surface.tenantUsername;
  if (path === `/${p}`) return "profile";
  if (path === `/${p}/repos` || path.startsWith(`/${p}/repos/`)) return "repos";
  return null;
}

function ownPathSurface(sessionUsername: string): PublicSurface {
  return createPublicSurface({
    tenantUsername: sessionUsername,
    mode: "path"
  });
}

/**
 * Pure resolver for Profile / Repositories / Dashboard topbar scope nav.
 * @see docs/superpowers/specs/2026-08-09-public-profile-repos-topbar-tabs-design.md
 */
export function resolvePublicScopeNav(input: {
  pathname: string;
  hostname?: string | null;
  /** Route params username when present */
  pathUsername?: string | null;
  /** Host-resolved tenant slug when on verified custom domain */
  customDomainUsername?: string | null;
  sessionUsername?: string | null;
  /** Override Host check (tests); default uses `isCustomDomainHost(hostname)`. */
  isCustomDomain?: boolean;
}): PublicScopeNavResult {
  const pathname = normalizePath(input.pathname);
  const hostname = input.hostname ?? null;
  const customHost = input.isCustomDomain ?? isCustomDomainHost(hostname);
  const trimmedSession = input.sessionUsername?.trim();
  const session = trimmedSession && trimmedSession.length > 0 ? trimmedSession : null;
  const showDashboard = Boolean(session);

  // Signed-in dashboard: show scope nav with own portfolio links + Dashboard active.
  if (isDashboardPath(pathname)) {
    if (!session) {
      return { show: false, surface: null, active: null, showDashboard: false };
    }
    return {
      show: true,
      surface: ownPathSurface(session),
      active: "dashboard",
      showDashboard: true
    };
  }

  if (isScopeNavHiddenPath(pathname)) {
    return { show: false, surface: null, active: null, showDashboard: false };
  }

  // Empty string after trim must fall through (?? alone would keep "").
  const trimmedPathProfile = input.pathUsername?.trim();
  const fromPath =
    trimmedPathProfile && trimmedPathProfile.length > 0
      ? trimmedPathProfile
      : pathUsernameFromPathname(pathname);

  // Page tenant: path slug, or custom-domain Host tenant
  let pageTenant: string | null = fromPath;
  if (!pageTenant && customHost) {
    const cd = input.customDomainUsername?.trim();
    if (cd && cd.length > 0) pageTenant = cd;
  }

  if (pageTenant) {
    // Prefer explicit Host mode so custom domains never emit `/{username}/…`.
    const surfaceFinal = customHost
      ? createPublicSurface({ tenantUsername: pageTenant, mode: "custom_domain" })
      : fromPath
        ? createPublicSurface({ tenantUsername: pageTenant, mode: "path" })
        : resolvePublicSurface({ tenantUsername: pageTenant, hostname });
    return {
      show: true,
      surface: surfaceFinal,
      active: activeScopeFromPathname(pathname, surfaceFinal),
      showDashboard
    };
  }

  // Custom Host without resolved tenant: never use session (wrong portfolio on someone else's domain).
  // Hide while resolve is pending or if Host is not a verified portfolio.
  if (customHost) {
    return { show: false, surface: null, active: null, showDashboard: false };
  }

  // Primary community root: signed-in → own surface (neither public tab active)
  if (pathname === "/") {
    if (session) {
      return {
        show: true,
        surface: ownPathSurface(session),
        active: null,
        showDashboard: true
      };
    }
    return { show: false, surface: null, active: null, showDashboard: false };
  }

  return { show: false, surface: null, active: null, showDashboard: false };
}
