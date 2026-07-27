import { ENV_WEB_ISOMORPHIC } from "@tsu-stack/env/web/env.isomorphic";

/** Canonical primary app origin (dashboard, auth) — never a custom portfolio domain. */
export function getPrimaryAppOrigin(): string {
  return new URL(ENV_WEB_ISOMORPHIC.VITE_WEB_URL).origin;
}

export function getPrimaryAppHostname(): string {
  return new URL(ENV_WEB_ISOMORPHIC.VITE_WEB_URL).hostname;
}

/** Absolute URL on the primary app host (use for dashboard/auth links from custom domains). */
export function primaryAppUrl(path = "/"): string {
  const origin = getPrimaryAppOrigin();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${normalized}`;
}

/**
 * True when the browser (or SSR request) Host is not the primary app host.
 * Used to force dashboard/auth onto the primary origin on custom domains.
 */
export function isCustomDomainHost(hostname: string | null | undefined): boolean {
  if (!hostname) return false;
  const host = hostname.split(":")[0]?.toLowerCase() ?? "";
  if (!host) return false;
  return host !== getPrimaryAppHostname().toLowerCase();
}
