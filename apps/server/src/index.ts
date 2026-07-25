import { type Server as HTTPServer } from "node:http";

import { serve } from "@hono/node-server";

import { ENV_SERVER } from "@tsu-stack/env/server/env";

import { app } from "#@/app";
import { createGithubGateway, broadcastSignals } from "#@/github-gateway";
import { initRuntime, setBroadcastSignals } from "#@/runtime-context";

initRuntime();

async function start(): Promise<void> {
  // Apply DB migrations before accepting traffic when opted in (Docker sets
  // RUN_MIGRATIONS=true). Leave unset in local dev — use `pnpm db:migrate`.
  if (process.env.RUN_MIGRATIONS === "true" || process.env.RUN_MIGRATIONS === "1") {
    const { migrateDatabase } = await import("@tsu-stack/db/migrate");
    // eslint-disable-next-line no-console
    console.log("Running database migrations...");
    await migrateDatabase();
    // eslint-disable-next-line no-console
    console.log("Database migrations complete");
  }

  const port = Number(ENV_SERVER.PORT ?? 5100);
  const httpServer = serve({ fetch: app.fetch, port }, (info) => {
    // eslint-disable-next-line no-console
    console.log(`Server running on http://localhost:${info.port}`);
  }) as unknown as HTTPServer;

  if (ENV_SERVER.REDIS_URL) {
    createGithubGateway(httpServer, ENV_SERVER.REDIS_URL);
    setBroadcastSignals(broadcastSignals);
  }
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Server failed to start:", err);
  process.exit(1);
});
