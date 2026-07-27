import { createORPCClient, eventIteratorToUnproxiedDataStream } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { type RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { ENV_WEB_ISOMORPHIC } from "@tsu-stack/env/web/env.isomorphic";

import { type AppRouter } from "#@/routers/index";

/**
 * Isomorphic oRPC client.
 *
 * The web app's SSR bundle must NOT import `@tsu-stack/db` (or any of its
 * transitive deps like `pg`). Nitro bundles workspace packages, and the
 * bundled `pg` comes out as a stub whose `Pool` class is an empty object —
 * producing the runtime `Class extends value #<Object> is not a constructor`
 * crash. The only safe path is to call the Hono server over HTTP, even
 * during SSR. So both the server and the client sides use RPCLink; the
 * server side just points at the internal Docker-network URL so we don't
 * loop through the Cloudflare tunnel for every SSR-time oRPC call.
 */
function getServerURL(): string {
  return ENV_WEB_ISOMORPHIC.SERVER_URL_INTERNAL ?? ENV_WEB_ISOMORPHIC.VITE_SERVER_URL;
}

function getHeaders(): Record<string, string> {
  const headers = getRequestHeaders();
  // Forward the incoming request's cookies (and any other relevant headers)
  // so the Hono server sees the same session for SSR oRPC calls.
  // Also forward Host as x-forwarded-host so public portfolio RPCs can resolve
  // verified custom domains during SSR (internal RPC URL is not the public Host).
  const out: Record<string, string> = {};
  const cookie = headers.get?.("cookie");
  if (cookie) {
    out.cookie = cookie;
  }
  const xfh = headers.get?.("x-forwarded-host")?.split(",")[0]?.trim() ?? "";
  const hostHeader = headers.get?.("host")?.trim() ?? "";
  const forwardedHost = xfh.length > 0 ? xfh : hostHeader.length > 0 ? hostHeader : null;
  if (forwardedHost) {
    out["x-forwarded-host"] = forwardedHost;
  }
  return out;
}

function isAbortError(error: unknown): boolean {
  if (error instanceof Error && error.name === "AbortError") return true;
  if (typeof DOMException !== "undefined" && error instanceof DOMException) {
    return error.name === "AbortError";
  }
  return false;
}

function isRetriable(error: unknown): boolean {
  if (isAbortError(error)) return false;
  if (!(error instanceof TypeError)) return false;
  const cause = (error as { cause?: { code?: string } }).cause;
  if (cause && typeof cause === "object" && "code" in cause) {
    return (
      cause.code === "ECONNREFUSED" || cause.code === "ECONNRESET" || cause.code === "EAI_AGAIN"
    );
  }
  return error.message === "fetch failed";
}

async function fetchWithRetry(
  url: string | URL | Request,
  options: RequestInit,
  maxAttempts = 5
): Promise<Response> {
  const target = typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url;
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fetch(url, { ...options, credentials: "include" });
    } catch (error) {
      lastError = error;
      if (!isRetriable(error) || attempt === maxAttempts - 1) throw error;
      const delay = 200 * 2 ** attempt;
      // oxlint-disable-next-line no-console
      console.warn("[rpc-fetch-retry]", { url: target, attempt: attempt + 1, delay, error });
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

const getORPCClient = createIsomorphicFn()
  .server((): RouterClient<AppRouter> => {
    const link = new RPCLink({
      url: `${getServerURL()}/rpc`,
      headers: getHeaders(),
      fetch: (url, options) =>
        fetchWithRetry(url, options ?? {}).catch((error) => {
          // SSR aborts in-flight RPCs after render/dehydrate; not actionable.
          if (isAbortError(error)) throw error;
          // oxlint-disable-next-line no-console
          console.error("[rpc-fetch-failed]", { url, error });
          throw error;
        })
    });
    return createORPCClient(link);
  })
  .client((): RouterClient<AppRouter> => {
    const link = new RPCLink({
      fetch: (url, options) =>
        fetchWithRetry(url, options ?? {}).catch((error) => {
          if (isAbortError(error)) throw error;
          // oxlint-disable-next-line no-console
          console.error("[rpc-fetch-failed]", { url, error });
          throw error;
        }),
      url: `${ENV_WEB_ISOMORPHIC.VITE_SERVER_URL}/rpc`
    });

    return createORPCClient(link);
  });
export const orpcClient = getORPCClient();

export const orpcQueryClient = createTanstackQueryUtils(orpcClient);

export { eventIteratorToUnproxiedDataStream };
