import { type Server as HTTPServer } from "node:http";

import { serve } from "@hono/node-server";

import { ENV_SERVER } from "@tsu-stack/env/server/env";
import { createLogger } from "@tsu-stack/logger/server";

import { app } from "#@/app";
import { createGithubGateway, broadcastSignals } from "#@/github-gateway";
import { initRuntime, setBroadcastSignals } from "#@/runtime-context";
import "#@/shared/lib/logger";

initRuntime();

async function start(): Promise<void> {
  // Apply DB migrations before accepting traffic when opted in (Docker sets
  // RUN_MIGRATIONS=true). Leave unset in local dev — use `pnpm db:migrate`.
  if (process.env.RUN_MIGRATIONS === "true" || process.env.RUN_MIGRATIONS === "1") {
    const migrateLog = createLogger({ operation: "server__database_migration" });
    try {
      const { migrateDatabase } = await import("@tsu-stack/db/migrate");
      await migrateDatabase();
      migrateLog.set({ event: "database_migration_completed" });
      migrateLog.emit();
    } catch (error) {
      migrateLog.error(error instanceof Error ? error : new Error(String(error)), {
        event: "database_migration_failed"
      });
      migrateLog.emit({ _forceKeep: true });
      throw error;
    }
  }

  const port = Number(ENV_SERVER.PORT ?? 5100);
  const httpServer = serve({ fetch: app.fetch, port }, (info) => {
    const bootLog = createLogger({ operation: "server__http_listen" });
    bootLog.set({
      event: "server_started",
      port: info.port,
      hasRedis: Boolean(ENV_SERVER.REDIS_URL)
    });
    bootLog.emit();
  }) as unknown as HTTPServer;

  if (ENV_SERVER.REDIS_URL) {
    createGithubGateway(httpServer, ENV_SERVER.REDIS_URL);
    setBroadcastSignals(broadcastSignals);
  }
}

start().catch((err) => {
  const failLog = createLogger({ operation: "server__start_failed" });
  failLog.error(err instanceof Error ? err : new Error(String(err)), {
    event: "server_start_failed"
  });
  failLog.emit({ _forceKeep: true });
  process.exit(1);
});
