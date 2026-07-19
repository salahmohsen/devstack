import { type Server as HTTPServer } from "node:http";

import { serve } from "@hono/node-server";

import { ENV_SERVER } from "@tsu-stack/env/server/env";

import { app } from "#@/app";
import { createGithubGateway, broadcastSignals } from "#@/github-gateway";
import { initRuntime, setBroadcastSignals } from "#@/runtime-context";

initRuntime();

const port = Number(ENV_SERVER.PORT ?? 5100);
const httpServer = serve({ fetch: app.fetch, port }, (info) => {
  // eslint-disable-next-line no-console
  console.log(`Server running on http://localhost:${info.port}`);
}) as unknown as HTTPServer;

if (ENV_SERVER.REDIS_URL) {
  createGithubGateway(httpServer, ENV_SERVER.REDIS_URL);
  setBroadcastSignals(broadcastSignals);
}

export { httpServer };
