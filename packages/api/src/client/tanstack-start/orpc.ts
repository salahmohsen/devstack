import { createORPCClient, eventIteratorToUnproxiedDataStream } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createRouterClient, type RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { createFiles } from "@tsu-stack/api/lib/storage/index";
import { auth } from "@tsu-stack/auth";
import { type OrpcContextMediaBucket } from "@tsu-stack/core";
import { createDb, runWithDb } from "@tsu-stack/db";
import { ENV_WEB_ISOMORPHIC } from "@tsu-stack/env/web/env.isomorphic";
import { ENV_WEB_SERVER } from "@tsu-stack/env/web/env.server";
import { createLogger } from "@tsu-stack/logger/server";

import { createAgentWorker } from "#@/lib/agent/worker";
import { type AppRouter, appRouter } from "#@/routers/index";

function adaptMediaBucket(rawFiles: ReturnType<typeof createFiles>): OrpcContextMediaBucket {
  return {
    async put(key, value, options) {
      const body =
        value instanceof ReadableStream
          ? value
          : value instanceof ArrayBuffer
            ? new Blob([value])
            : value;
      await rawFiles.upload(key, body as Blob | ReadableStream, {
        contentType: options?.httpMetadata?.contentType
      });
      return { key };
    },
    async get(key) {
      try {
        const file = await rawFiles.download(key);
        return { body: file.stream(), key: file.key };
      } catch {
        return null;
      }
    },
    async delete(key) {
      await rawFiles.delete(key);
    }
  };
}

const getORPCClient = createIsomorphicFn()
  .server(() =>
    createRouterClient(appRouter, {
      context: async () =>
        runWithDb(createDb(), async () => {
          const headers = getRequestHeaders();
          const session = await auth.api.getSession({ headers });
          const [{ createGitHubOctokit }, { resolvePublicGitHubSource }] = await Promise.all([
            import("@tsu-stack/github/infrastructure/octokit/client"),
            import("@tsu-stack/github/shared/public-github-source")
          ]);
          const githubSource = await resolvePublicGitHubSource();

          const agentWorker = ENV_WEB_SERVER.AGENT_WORKER_URL
            ? createAgentWorker({ AGENT_WORKER_URL: ENV_WEB_SERVER.AGENT_WORKER_URL })
            : {
                fetch(): Promise<Response> {
                  throw new Error("Agent worker is not configured. Set AGENT_WORKER_URL.");
                }
              };

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
            mediaBucket: adaptMediaBucket(createFiles()),
            agentWorker
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

export { eventIteratorToUnproxiedDataStream };
