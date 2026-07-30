/**
 * Agent-process logger wrapper.
 *
 * Mastra's build can leave createLogger without process-level init fields.
 * Always stamp service/environment so Axiom filters and dashboards work.
 */
import { createLogger as createBaseLogger, LOG_SERVICES } from "@tsu-stack/logger/server";

const AGENT_ENV = {
  service: LOG_SERVICES.AGENT,
  environment: process.env.NODE_ENV === "production" ? "production" : "development",
  version: process.env.SOURCE_COMMIT ?? "unknown"
} as const;

export function createAgentLogger(options: { operation: string }) {
  const log = createBaseLogger({ operation: options.operation });
  // Stamp identity on every logger so emits land with the right service tag
  // even if initLogger was skipped or a dual-package copy was used.
  log.set({ ...AGENT_ENV });
  return log;
}
