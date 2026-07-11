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

const storage = ENV_SERVER.IS_BUILD
  ? new MastraCompositeStore({
      id: "composite-storage",
      default: new LibSQLStore({
        id: "mastra-agent-storage",
        url: "file:./mastra.db"
      }),
      domains: {
        observability: new DuckDBStore().observability
      }
    })
  : ENV_SERVER.TURSO_DATABASE_URL
    ? new MastraCompositeStore({
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
      })
    : (() => {
        throw new Error(
          "TURSO_DATABASE_URL is required in production. Set it in Cloudflare dashboard → Settings → Variables."
        );
      })();

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
    }
  }),
  workflows: { weatherWorkflow },
  agents: { weatherAgent },
  scorers: { toolCallAppropriatenessScorer, completenessScorer, translationScorer },
  storage,
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
