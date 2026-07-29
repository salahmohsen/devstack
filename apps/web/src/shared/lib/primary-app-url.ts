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

/** Local loopback hosts treated as the primary app in development. */
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/**
 * True when the browser (or SSR request) Host is not the primary app host.
 * Used to force dashboard/auth onto the primary origin on custom domains.
 *
 * Loopback peers (`localhost` ↔ `127.0.0.1`) are never treated as custom domains
 * so local dev does not resolve portfolio via Host or redirect dashboard away.
 */
export function isCustomDomainHost(hostname: string | null | undefined): boolean {
  if (!hostname) return false;
  const host = hostname.split(":")[0]?.toLowerCase() ?? "";
  if (!host) return false;

  const primary = getPrimaryAppHostname().toLowerCase();
  if (host === primary) return false;
  if (LOOPBACK_HOSTS.has(host) && LOOPBACK_HOSTS.has(primary)) return false;

  return true;
}
