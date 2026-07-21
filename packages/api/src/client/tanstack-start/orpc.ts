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
  return (
    ENV_WEB_ISOMORPHIC.VITE_SERVER_URL_INTERNAL ??
    ENV_WEB_ISOMORPHIC.VITE_SERVER_URL
  );
}

function getHeaders(): HeadersInit {
  const headers = getRequestHeaders();
  // Forward the incoming request's cookies (and any other relevant headers)
  // so the Hono server sees the same session for SSR oRPC calls.
  const cookie = headers.get?.("cookie");
  if (cookie) {
    return { cookie };
  }
  return {};
}

const getORPCClient = createIsomorphicFn()
  .server((): RouterClient<AppRouter> => {
    const link = new RPCLink({
      url: `${getServerURL()}/rpc`,
      headers: getHeaders(),
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: "include"
        }).catch((error) => {
          // oxlint-disable-next-line no-console
          console.error("[rpc-fetch-failed]", { url, error });
          throw error;
        });
      }
    });
    return createORPCClient(link);
  })
  .client((): RouterClient<AppRouter> => {
    const link = new RPCLink({
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: "include"
        }).catch((error) => {
          // oxlint-disable-next-line no-console
          console.error("[rpc-fetch-failed]", { url, error });
          throw error;
        });
      },
      url: `${ENV_WEB_ISOMORPHIC.VITE_SERVER_URL}/rpc`
    });

    return createORPCClient(link);
  });
export const orpcClient = getORPCClient();

export const orpcQueryClient = createTanstackQueryUtils(orpcClient);

export { eventIteratorToUnproxiedDataStream };
