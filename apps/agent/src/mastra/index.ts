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

import { ENV_SERVER } from "@tsu-stack/env/server/env";

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
    ],
    d1_databases: [
      {
        binding: "mastra_agent_store",
        database_name: "mastra-agent-store",
        database_id: ENV_SERVER.CLOUDFLARE_D1_DATABASE_ID!,
        preview_database_id:
          ENV_SERVER.CLOUDFLARE_D1_PREVIEW_DATABASE_ID ?? ENV_SERVER.CLOUDFLARE_D1_DATABASE_ID
      }
    ],
    kv_namespaces: [
      {
        binding: "AGENT_CACHE",
        id: ENV_SERVER.CLOUDFLARE_KV_AGENT_CACHE_ID!
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
      observability: await new DuckDBStore().getStore("observability")
    }
  }),
  logger: new PinoLogger({
    name: "Mastra",
    level: "info"
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: "mastra",
        exporters: [
          new MastraStorageExporter(), // Persists observability events to Mastra Storage
          new MastraPlatformExporter() // Sends observability events to Mastra Platform (if MASTRA_PLATFORM_ACCESS_TOKEN is set)
        ],
        spanOutputProcessors: [new SensitiveDataFilter()]
      }
    }
  })
});
