import { chatRoute } from "@mastra/ai-sdk";
import { Mastra } from "@mastra/core/mastra";
import { MastraCompositeStore } from "@mastra/core/storage";
import { CloudflareDeployer } from "@mastra/deployer-cloudflare";
import { DuckDBStore } from "@mastra/duckdb";
import { LibSQLStore } from "@mastra/libsql";
import { PinoLogger } from "@mastra/loggers";
import {
  MastraPlatformExporter,
  MastraStorageExporter,
  Observability,
  SensitiveDataFilter
} from "@mastra/observability";

import { weatherAgent } from "#@/mastra/agents/weather-agent";
import {
  completenessScorer,
  toolCallAppropriatenessScorer,
  translationScorer
} from "#@/mastra/scorers/weather-scorer";
import { weatherWorkflow } from "#@/mastra/workflows/weather-workflow";

export const mastra = new Mastra({
  server: {
    apiRoutes: [
      chatRoute({
        path: "/chat/:agentId"
      })
    ]
  },
  bundler: {
    externals: ["@duckdb/node-bindings"]
  },
  deployer: new CloudflareDeployer({
    name: "devhub-agent",
    routes: [
      {
        pattern: "salahmohsen.com/agent*",
        zone_name: "salahmohsen.com",
        custom_domain: true
      }
    ]
  }),
  workflows: { weatherWorkflow },
  agents: { weatherAgent },
  scorers: { toolCallAppropriatenessScorer, completenessScorer, translationScorer },
  storage: new MastraCompositeStore({
    id: "composite-storage",
    default: new LibSQLStore({
      id: "mastra-agent-storage",
      url: "file:./mastra.db"
    }),
    domains: {
      observability:
        process.env.NODE_ENV === "development"
          ? await new DuckDBStore().getStore("observability")
          : undefined
    }
  }),
  logger: new PinoLogger({
    name: "Mastra",
    level: "info"
  }),
  observability: new Observability({
    configs: {
      development: {
        serviceName: "mastra-dev",
        exporters: [new MastraStorageExporter()], // Persists observability events to Mastra Storage,
        logging: {
          enabled: true,
          level: "debug"
        }
      },
      production: {
        serviceName: "mastra-prod",
        exporters: [new MastraPlatformExporter()], // Sends observability events to Mastra Platform (if MASTRA_PLATFORM_ACCESS_TOKEN is set),
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
