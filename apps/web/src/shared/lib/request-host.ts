import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

/**
 * Current request hostname (no port), isomorphic.
 * Server: from Host / x-forwarded-host. Client: window.location.hostname.
 */
export const getRequestHostname = createIsomorphicFn()
  .server((): string | null => {
    const request = getRequest();
    const xfh = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ?? "";
    const hostHeader = request.headers.get("host")?.trim() ?? "";
    const raw = xfh.length > 0 ? xfh : hostHeader.length > 0 ? hostHeader : null;
    if (!raw) return null;
    if (raw.includes(":") && !raw.startsWith("[")) {
      return (raw.split(":")[0] ?? raw).toLowerCase();
    }
    return raw.toLowerCase();
  })
  .client((): string | null => {
    if (typeof window === "undefined") return null;
    const hostname = window.location.hostname.toLowerCase();
    return hostname.length > 0 ? hostname : null;
  });
