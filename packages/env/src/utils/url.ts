import { isProduction } from "std-env";
import { z } from "zod";

const URL_WITH_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//;

export function normalizeUrlString(value: string): string {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return trimmedValue;
  }

  const protocol = isProduction ? "https://" : "http://";

  return URL_WITH_SCHEME_PATTERN.test(trimmedValue) ? trimmedValue : `${protocol}${trimmedValue}`;
}

export const normalizedUrlSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  return normalizeUrlString(value);
}, z.url());

/**
 * API mount path derived from `VITE_SERVER_URL` pathname.
 * - `https://api.example.com` → `""` (app at root)
 * - `https://example.com/server` → `"/server"`
 */
export function getApiBasePath(serverUrl: string): string {
  try {
    const pathname = new URL(serverUrl).pathname.replace(/\/+$/, "");
    if (!pathname || pathname === "/") return "";
    return pathname.startsWith("/") ? pathname : `/${pathname}`;
  } catch {
    return "";
  }
}

/** Join base path segments into an absolute path (`/auth`, `/rpc`, …). */
export function joinApiPath(...segments: string[]): `/${string}` {
  const parts = segments.flatMap((s) => s.split("/")).filter(Boolean);
  return `/${parts.join("/")}` as `/${string}`;
}
