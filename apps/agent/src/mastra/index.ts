import { chatRoute } from "@mastra/ai-sdk";
import { D1Store } from "@mastra/cloudflare-d1";
import { Mastra } from "@mastra/core/mastra";
import { CloudflareDeployer } from "@mastra/deployer-cloudflare";
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

const storage = ENV_SERVER.CLOUDFLARE_D1_API_TOKEN
  ? new D1Store({
      id: "mastra-agent-storage",
      accountId: ENV_SERVER.CLOUDFLARE_ACCOUNT_ID!,
      databaseId: ENV_SERVER.CLOUDFLARE_D1_DATABASE_ID!,
      apiToken: ENV_SERVER.CLOUDFLARE_D1_API_TOKEN
    })
  : new LibSQLStore({
      id: "mastra-agent-storage",
      url: "file:./mastra.db"
    });

export const mastra = new Mastra({
  server: {
    apiRoutes: [
      chatRoute({
        path: "/chat/:agentId"
      })
    ]
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
  storage,
  logger: new PinoLogger({
    name: "Mastra",
    level: "info"
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: "mastra",
        exporters: [
          new MastraPlatformExporter(),
          ...(ENV_SERVER.MASTRA_PLATFORM_ACCESS_TOKEN ? [] : [new MastraStorageExporter()])
        ],
        spanOutputProcessors: [new SensitiveDataFilter()]
      }
    }
  })
});
