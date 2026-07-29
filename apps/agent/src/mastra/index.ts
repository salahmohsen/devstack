import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chatRoute } from "@mastra/ai-sdk";
import { Mastra } from "@mastra/core/mastra";
import { MastraCompositeStore } from "@mastra/core/storage";
import { DuckDBStore } from "@mastra/duckdb";
import { PinoLogger } from "@mastra/loggers";
import {
  MastraPlatformExporter,
  MastraStorageExporter,
  Observability,
  SensitiveDataFilter
} from "@mastra/observability";
import { PostgresStore } from "@mastra/pg";

import { createHubSupervisor } from "#@/mastra/agents/hub-supervisor";
import { createResumeImportExtractorAgent } from "#@/mastra/agents/resume-import-extractor-agent";
import { createStackCategorizerAgent } from "#@/mastra/agents/stack-categorizer-agent";
import "#@/mastra/logger-bootstrap";
import { detectStacksWorkflow } from "#@/mastra/workflows/detect-stacks-workflow";
import { organizeStacksWorkflow } from "#@/mastra/workflows/organize-stacks-workflow";
import { resumeImportWorkflow } from "#@/mastra/workflows/resume-import-workflow";

// Fail loud in logs when LLM keys required by model-config are missing.
// Without this, detect-stacks fails mid-run with a generic agent-stream error.
if (!process.env.DEEPSEEK_API_KEY?.trim()) {
  console.debug(
    "[agent] DEEPSEEK_API_KEY is not set. Models deepseek/* will fail. " +
      "Add it to packages/env/.env and restart the agent (dotenvx does not hot-reload env)."
  );
}

/**
 * Storage layout (Mastra docs — observability/storage):
 *
 * - **Default (Postgres):** memory, workflows, scores, threads — full app features.
 * - **Observability domain (DuckDB):** traces, logs, metrics, feedback.
 *
 * Postgres alone does not support batch log/metric inserts used by
 * `MastraStorageExporter`, which produced:
 *   "This storage provider does not support batch creating logs"
 *
 * DuckDB is the recommended OLAP store for local/dev observability; use
 * ClickHouse for high-volume production if you outgrow DuckDB.
 *
 * @see https://mastra.ai/docs/observability/storage
 * @see https://mastra.ai/docs/observability/overview
 */
const mastraConnectionString = process.env.MASTRA_DATABASE_URL?.trim() ?? process.env.DATABASE_URL;

const appStorage = new PostgresStore({
  id: "mastra-agent-storage",
  // Prefer a dedicated DB so Mastra tables never mix with the app schema.
  // Prod compose sets POSTGRES_DB=mastra_agent; local uses MASTRA_DATABASE_URL.
  connectionString: mastraConnectionString
});

// Absolute path: Mastra's process CWD can be `src/mastra/public` in dev, so a
// relative `./.mastra/...` path fails with "No such file or directory".
// `import.meta.url` → apps/agent/src/mastra/index.ts → apps/agent root.
const agentPackageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const observabilityDbPath =
  process.env.MASTRA_OBSERVABILITY_DB_PATH?.trim() ??
  resolve(agentPackageRoot, ".mastra/observability.duckdb");

// DuckDB does not create parent directories itself.
mkdirSync(dirname(observabilityDbPath), { recursive: true });

const observabilityStorage = new DuckDBStore({
  id: "mastra-observability",
  path: observabilityDbPath
});

const storage = new MastraCompositeStore({
  id: "mastra-composite-storage",
  default: appStorage,
  domains: {
    observability: observabilityStorage.observability
  }
});

export const mastra = new Mastra({
  server: {
    apiRoutes: [
      chatRoute({
        path: "/chat/:agentId",
        version: "v6"
      })
    ]
  },
  workflows: {
    detectStacksWorkflow,
    organizeStacksWorkflow,
    resumeImportWorkflow
  },
  agents: {
    stackCategorizerAgent: createStackCategorizerAgent(),
    hubSupervisor: createHubSupervisor(),
    resumeImportExtractor: createResumeImportExtractorAgent()
  },
  storage,
  logger: new PinoLogger({
    name: "personal-hub-agent",
    level: "info"
  }),
  observability: new Observability({
    configs: {
      development: {
        serviceName: "mastra-dev",
        exporters: [new MastraStorageExporter()],
        logging: {
          enabled: true,
          level: "debug"
        }
      },
      production: {
        serviceName: "mastra-prod",
        exporters: [
          new MastraStorageExporter(),
          // Sends to Mastra platform when MASTRA_PLATFORM_ACCESS_TOKEN is set
          new MastraPlatformExporter()
        ],
        spanOutputProcessors: [new SensitiveDataFilter()],
        logging: {
          enabled: true,
          level: "info"
        }
      }
    },
    configSelector: () => (process.env.NODE_ENV === "production" ? "production" : "development")
  })
});
