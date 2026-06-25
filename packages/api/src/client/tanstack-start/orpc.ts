import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createRouterClient, type RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { auth } from "@tsu-stack/auth";
import { createDb, runWithDb } from "@tsu-stack/db";
import { ENV_WEB_ISOMORPHIC } from "@tsu-stack/env/web/env.isomorphic";
import { createLogger } from "@tsu-stack/logger/server";

import { type AppRouter, appRouter } from "#@/routers/index";

const getORPCClient = createIsomorphicFn()
  .server(() =>
    createRouterClient(appRouter, {
      context: async () => {
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
            privateOctokit: createGitHubOctokit(
              githubSource.isConfigured ? githubSource : undefined
            ),
            publicOctokit: createGitHubOctokit(
              githubSource.isConfigured ? githubSource : undefined
            ),
            source: githubSource
          },
          logger: createLogger({ operation: "web__client__orpc" }),
          session
        };
      },
      // Wrap the entire procedure call (context build + handler) in
      // `runWithDb` so `getDb()` inside the handler returns the per-request
      // WS Drizzle instance, not the HTTP singleton fallback. Mirrors the
      // Hono middleware pattern at `apps/server/src/app.ts:324-385`.
      interceptors: [
        (options) => {
          const db = createDb();
          return runWithDb(db, () => options.next());
        }
      ]
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
