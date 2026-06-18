import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createRouterClient, type RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { auth } from "@tsu-stack/auth/index";
import { createDb, runWithDb } from "@tsu-stack/db";
import { ENV_WEB_ISOMORPHIC } from "@tsu-stack/env/web/env.isomorphic";
import { createLogger } from "@tsu-stack/logger/server";

import { type AppRouter, appRouter } from "#@/routers/index";

const getORPCClient = createIsomorphicFn()
  .server(() =>
    createRouterClient(appRouter, {
      context: async () => {
        // Per-request WebSocket Pool. Required by Cloudflare Workers: the
        // serverless driver's WebSocket connection cannot outlive a single
        // request, and a module-level Pool gets reused across requests →
        // "Connection terminated" (see Neon's "Pool and Client" docs).
        const db = createDb();

        return runWithDb(db, async () => {
          const headers = getRequestHeaders();
          const session = await auth.api.getSession({ headers });
          const [{ createGitHubOctokit }, { resolvePublicGitHubSource }] = await Promise.all([
            import("@tsu-stack/github/infrastructure/octokit/client"),
            import("@tsu-stack/github/shared/public-github-source")
          ]);
          const githubSource = await resolvePublicGitHubSource();

          return {
            github: {
              binding: {},
              octokit: createGitHubOctokit(githubSource.isConfigured ? githubSource : undefined),
              source: githubSource
            },
            logger: createLogger({ operation: "web__client__orpc" }),
            session
          };
        });
      }
    })
  )
  .client((): RouterClient<AppRouter> => {
    const link = new RPCLink({
      fetch(url, options) {
        return fetch(url, {
          ...options,

          credentials: "include"
        }).catch((error) => {
          console.error("[rpc-fetch-failed]", { url, error });
          throw error;
        });
      },
      url: `${ENV_WEB_ISOMORPHIC.VITE_SERVER_URL}/rpc`
    });

    return createORPCClient(link);
  });
export const client = getORPCClient();

export const orpc = createTanstackQueryUtils(client);
