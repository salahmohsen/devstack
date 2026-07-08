import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createRouterClient, type RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { env } from "cloudflare:workers";

import { auth } from "@tsu-stack/auth";
import { type OrpcContextMediaBucket } from "@tsu-stack/core";
import { createDb, runWithDb } from "@tsu-stack/db";
import { ENV_WEB_ISOMORPHIC } from "@tsu-stack/env/web/env.isomorphic";
import { createLogger } from "@tsu-stack/logger/server";

import { type AppRouter, appRouter } from "#@/routers/index";

const getORPCClient = createIsomorphicFn()
  .server(() =>
    createRouterClient(appRouter, {
      context: async () =>
        // The oRPC server calls this context function (bundled
        // @orpc_server.js:406) BEFORE invoking the interceptors that wrap
        // the procedure's main call. So both layers need their own
        // runWithDb scope: this one for the context build (where
        // resolvePublicGitHubSource → findPublicGithubSourceSettings reads
        // github_config), and the interceptor below for the handler call.
        runWithDb(createDb(), async () => {
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
            session,
            mediaBucket: (env as Record<string, unknown>).MEDIA_BUCKET as OrpcContextMediaBucket
          };
        }),
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
