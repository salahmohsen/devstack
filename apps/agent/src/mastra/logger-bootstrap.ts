import { createLogger, initLogger, LOG_SERVICES } from "@tsu-stack/logger/server";

/**
 * Product/ops wide events for the agent process (complement Mastra Pino + observability).
 * Import this module once from the Mastra entrypoint before workflows run.
 */
const environment = process.env.NODE_ENV === "production" ? "production" : "development";

initLogger({
  env: {
    environment,
    service: LOG_SERVICES.AGENT,
    version: process.env.SOURCE_COMMIT ?? "unknown"
  }
});

const boot = createLogger({ operation: "agent__process_boot" });
boot.set({
  event: "agent_process_boot",
  service: LOG_SERVICES.AGENT,
  environment,
  llmAuth: "byo_settings",
  agentAuth: "mastra_auth_better_auth",
  hasMastraDatabaseUrl: Boolean(
    process.env.MASTRA_DATABASE_URL?.trim() ?? process.env.DATABASE_URL?.trim()
  ),
  hasBetterAuthSecret: Boolean(process.env.BETTER_AUTH_SECRET?.trim()),
  hasAxiom: Boolean(process.env.AXIOM_API_KEY?.trim() && process.env.AXIOM_DATASET?.trim()),
  nodeEnv: process.env.NODE_ENV ?? "unknown"
});
boot.emit({ _forceKeep: true });
