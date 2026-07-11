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
    externals: ["@mastra/duckdb", "@duckdb/node-bindings"]
  },
  deployer: new CloudflareDeployer({
    name: "devhub-agent",
    routes: [
      {
        pattern: "salahmohsen.com/agent*",
        zone_name: "salahmohsen.com"
      }
    ],
    alias: {
      "@mastra/duckdb": "./duckdb-stub.mjs"
    },
    vars: {
      TURSO_DATABASE_URL: ENV_SERVER.TURSO_DATABASE_URL!,
      TURSO_AUTH_TOKEN: ENV_SERVER.TURSO_AUTH_TOKEN!
    }
  }),
  workflows: { weatherWorkflow },
  agents: { weatherAgent },
  scorers: { toolCallAppropriatenessScorer, completenessScorer, translationScorer },
  storage: (() => {
    if (ENV_SERVER.TURSO_DATABASE_URL) {
      return new MastraCompositeStore({
        id: "composite-storage",
        default: new LibSQLStore({
          id: "mastra-agent-storage",
          url: ENV_SERVER.TURSO_DATABASE_URL,
          authToken: ENV_SERVER.TURSO_AUTH_TOKEN ?? undefined
        }),
        domains: {
          observability:
            ENV_SERVER.NODE_ENV === "development" ? new DuckDBStore().observability : undefined
        }
      });
    }
    return new MastraCompositeStore({
      id: "composite-storage",
      default: new LibSQLStore({
        id: "mastra-agent-storage",
        url: "file:./mastra.db"
      }),
      domains: {
        observability: new DuckDBStore().observability
      }
    });
  })(),
  logger: new PinoLogger({
    name: "Mastra",
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
