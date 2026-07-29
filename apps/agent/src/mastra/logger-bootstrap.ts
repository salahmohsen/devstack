import { createLogger, initLogger, LOG_SERVICES } from "@tsu-stack/logger/server";

/**
 * Product/ops wide events for the agent process (complement Mastra Pino + observability).
 * Import this module once from the Mastra entrypoint before workflows run.
 */
initLogger({
  env: {
    environment: process.env.NODE_ENV === "production" ? "production" : "development",
    service: LOG_SERVICES.AGENT,
    version: process.env.SOURCE_COMMIT ?? process.env.WORKERS_CI_COMMIT_SHA ?? "unknown"
  }
});

const boot = createLogger({ operation: "agent__process_boot" });
boot.set({
  event: "agent_process_boot",
  hasDeepseekKey: Boolean(process.env.DEEPSEEK_API_KEY?.trim()),
  hasMastraDatabaseUrl: Boolean(
    process.env.MASTRA_DATABASE_URL?.trim() ?? process.env.DATABASE_URL?.trim()
  )
});
boot.emit();
