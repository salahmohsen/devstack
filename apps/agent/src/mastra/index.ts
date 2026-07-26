import { chatRoute } from "@mastra/ai-sdk";
import { Mastra } from "@mastra/core/mastra";
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
import { createWeatherAgent } from "#@/mastra/agents/weather-agent";
import {
  completenessScorer,
  toolCallAppropriatenessScorer,
  translationScorer
} from "#@/mastra/scorers/weather-scorer";
import { detectStacksWorkflow } from "#@/mastra/workflows/detect-stacks-workflow";
import { organizeStacksWorkflow } from "#@/mastra/workflows/organize-stacks-workflow";
import { resumeImportWorkflow } from "#@/mastra/workflows/resume-import-workflow";
import { weatherWorkflow } from "#@/mastra/workflows/weather-workflow";

// Fail loud in logs when LLM keys required by model-config are missing.
// Without this, detect-stacks fails mid-run with a generic agent-stream error.
if (!process.env.DEEPSEEK_API_KEY?.trim()) {
  console.debug(
    "[agent] DEEPSEEK_API_KEY is not set. Models deepseek/* will fail. " +
      "Add it to packages/env/.env and restart the agent (dotenvx does not hot-reload env)."
  );
}

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
    weatherWorkflow,
    detectStacksWorkflow,
    organizeStacksWorkflow,
    resumeImportWorkflow
  },
  agents: {
    weatherAgent: createWeatherAgent(),
    stackCategorizerAgent: createStackCategorizerAgent(),
    hubSupervisor: createHubSupervisor(),
    resumeImportExtractor: createResumeImportExtractorAgent()
  },
  scorers: { toolCallAppropriatenessScorer, completenessScorer, translationScorer },
  storage: new PostgresStore({
    id: "mastra-agent-storage",
    // Prefer a dedicated DB so Mastra tables never mix with the app schema.
    // Prod compose sets POSTGRES_DB=mastra_agent; local uses MASTRA_DATABASE_URL.
    connectionString: process.env.MASTRA_DATABASE_URL?.trim() ?? process.env.DATABASE_URL
  }),
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
        exporters: [new MastraPlatformExporter()],
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
