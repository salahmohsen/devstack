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

/**
 * Shared cookie Domain for Better Auth when the web app and API sit on
 * different hosts under one registrable domain
 * (e.g. `salahmohsen.com` + `api.salahmohsen.com` → `.salahmohsen.com`).
 *
 * Returns `undefined` when hosts match (local `localhost` / same origin) or
 * when there is no safe shared parent — caller should leave
 * `crossSubDomainCookies` disabled in those cases.
 */
export function getSharedCookieDomain(webUrl: string, serverUrl: string): string | undefined {
  let webHost: string;
  let serverHost: string;
  try {
    webHost = new URL(webUrl).hostname.toLowerCase();
    serverHost = new URL(serverUrl).hostname.toLowerCase();
  } catch {
    return undefined;
  }

  if (!webHost || !serverHost || webHost === serverHost) {
    return undefined;
  }

  // Never set Domain on bare hosts (localhost, IPs).
  if (webHost === "localhost" || serverHost === "localhost") {
    return undefined;
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(webHost) || /^\d{1,3}(\.\d{1,3}){3}$/.test(serverHost)) {
    return undefined;
  }

  // api.example.com + example.com → .example.com
  if (serverHost.endsWith(`.${webHost}`)) {
    return `.${webHost}`;
  }
  if (webHost.endsWith(`.${serverHost}`)) {
    return `.${serverHost}`;
  }

  // app.example.com + api.example.com → .example.com
  const webLabels = webHost.split(".");
  const serverLabels = serverHost.split(".");
  let shared = 0;
  while (
    shared < webLabels.length &&
    shared < serverLabels.length &&
    webLabels[webLabels.length - 1 - shared] === serverLabels[serverLabels.length - 1 - shared]
  ) {
    shared += 1;
  }

  // Require at least two labels so we never emit ".com" / ".co.uk"-unsafe roots.
  // Multi-part public suffixes (co.uk) still need an explicit deploy-time domain
  // if web/api only share that suffix — rare for this stack's default layout.
  if (shared < 2) {
    return undefined;
  }

  return `.${webLabels.slice(webLabels.length - shared).join(".")}`;
}
