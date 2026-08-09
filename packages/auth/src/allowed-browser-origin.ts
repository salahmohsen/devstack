import { normalizeHostname } from "@tsu-stack/core";
import { userCustomDomainRepository } from "@tsu-stack/db";
import { ENV_SERVER } from "@tsu-stack/env/server/env";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
const CACHE_TTL_MS = 60_000;

type CacheEntry = { allowed: boolean; expiresAt: number };
const originCache = new Map<string, CacheEntry>();

export function buildStaticAllowedOrigins(webUrl: string): Set<string> {
  const origins = new Set<string>();
  try {
    const web = new URL(webUrl);
    origins.add(web.origin);
    if (LOOPBACK_HOSTS.has(web.hostname)) {
      for (const host of LOOPBACK_HOSTS) {
        if (host.startsWith("[")) continue;
        origins.add(`${web.protocol}//${host}${web.port ? `:${web.port}` : ""}`);
      }
    }
  } catch {
    // invalid URL → empty static set
  }
  return origins;
}

const staticAllowedOrigins = buildStaticAllowedOrigins(ENV_SERVER.VITE_WEB_URL);

/**
 * Best-effort per-process cache. Omit arg → clear all.
 * With hostname or Origin → drop matching entries only.
 * Multi-instance: other processes rely on TTL ≤ 60s.
 */
export function invalidateAllowedOriginCache(hostnameOrOrigin?: string): void {
  if (!hostnameOrOrigin) {
    originCache.clear();
    return;
  }
  let hostKey = hostnameOrOrigin.trim().toLowerCase();
  try {
    if (hostnameOrOrigin.includes("://")) {
      hostKey = normalizeHostname(new URL(hostnameOrOrigin).host);
    } else {
      hostKey = normalizeHostname(hostnameOrOrigin);
    }
  } catch {
    hostKey = hostnameOrOrigin.trim().toLowerCase();
  }
  for (const key of originCache.keys()) {
    try {
      const h = normalizeHostname(new URL(key).host);
      if (h === hostKey || key === hostnameOrOrigin) {
        originCache.delete(key);
      }
    } catch {
      if (key === hostnameOrOrigin) originCache.delete(key);
    }
  }
}

/**
 * Fail-closed: parse/DB errors → null (deny). Never throw for CORS origin callback.
 * CORS may run outside runWithDb — getDb() singleton fallback is OK for this read.
 */
export async function resolveAllowedBrowserOrigin(origin: string): Promise<string | null> {
  if (!origin) return null;

  const cached = originCache.get(origin);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.allowed ? origin : null;
  }

  try {
    if (staticAllowedOrigins.has(origin)) {
      originCache.set(origin, { allowed: true, expiresAt: Date.now() + CACHE_TTL_MS });
      return origin;
    }

    const hostname = normalizeHostname(new URL(origin).host);
    if (!hostname) {
      originCache.set(origin, { allowed: false, expiresAt: Date.now() + CACHE_TTL_MS });
      return null;
    }

    const row = await userCustomDomainRepository.findVerifiedByHostname(hostname);
    const allowed = Boolean(row);
    originCache.set(origin, { allowed, expiresAt: Date.now() + CACHE_TTL_MS });
    return allowed ? origin : null;
  } catch {
    return null;
  }
}

export async function resolveTrustedOriginsForRequest(request?: Request): Promise<string[]> {
  const origins = [...staticAllowedOrigins];
  const header = request?.headers.get("origin");
  if (!header) return origins;

  const allowed = await resolveAllowedBrowserOrigin(header);
  if (allowed && !origins.includes(allowed)) {
    origins.push(allowed);
  }
  return origins;
}
