import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chatRoute } from "@mastra/ai-sdk";
import { MastraAuthBetterAuth } from "@mastra/auth-better-auth";
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

import { createApplyPackageAgent } from "#@/mastra/agents/apply-package-agent";
import { createCrmApplicationMatcherAgent } from "#@/mastra/agents/crm-application-matcher-agent";
import { createCrmStageAdvisorAgent } from "#@/mastra/agents/crm-stage-advisor-agent";
import { createHubSupervisor } from "#@/mastra/agents/hub-supervisor";
import { createJobAgentTakeAgent } from "#@/mastra/agents/job-agent-take-agent";
import { createJobNotifierMailExtractorAgent } from "#@/mastra/agents/job-notifier-mail-extractor-agent";
import { createJobPageExtractorAgent } from "#@/mastra/agents/job-page-extractor-agent";
import { createJobPreferenceMatchScorerAgent } from "#@/mastra/agents/job-preference-match-scorer-agent";
import { createMailClassifierAgent } from "#@/mastra/agents/mail-classifier-agent";
import { createMailReplyAgent } from "#@/mastra/agents/mail-reply-agent";
import { createProviderPingAgent } from "#@/mastra/agents/provider-ping-agent";
import { createResumeImportExtractorAgent } from "#@/mastra/agents/resume-import-extractor-agent";
import { createSearchBriefWriterAgent } from "#@/mastra/agents/search-brief-writer-agent";
import { createStackCategorizerAgent } from "#@/mastra/agents/stack-categorizer-agent";
import { createTodayLetterWriterAgent } from "#@/mastra/agents/today-letter-writer-agent";
import "#@/mastra/logger-bootstrap";
import { agentSessionAuth } from "#@/mastra/session-auth";
import { applyPackageWorkflow } from "#@/mastra/workflows/apply-package-workflow";
import { detectStacksWorkflow } from "#@/mastra/workflows/detect-stacks-workflow";
import { mailClassifyWorkflow } from "#@/mastra/workflows/mail-classify-workflow";
import { mailJobHarvestWorkflow } from "#@/mastra/workflows/mail-job-harvest-workflow";
import { mailProcessWorkflow } from "#@/mastra/workflows/mail-process-workflow";
import { mailReplyWorkflow } from "#@/mastra/workflows/mail-reply-workflow";
import { organizeStacksWorkflow } from "#@/mastra/workflows/organize-stacks-workflow";
import { resumeImportWorkflow } from "#@/mastra/workflows/resume-import-workflow";
import { todayLetterWorkflow } from "#@/mastra/workflows/today-letter-workflow";

// Product LLM: Settings BYO only (workflow input.llm / requestContext). No provider env keys.

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

/**
 * Better Auth session verification for all Mastra HTTP routes.
 * @see https://mastra.ai/docs/server/auth/better-auth
 * Server/API forwards the user's session as Authorization: Bearer <token>.
 */
const mastraAuth = new MastraAuthBetterAuth({
  // Session-only Better Auth (same secret + session tables as API).
  auth: agentSessionAuth,
  public: ["/api/health", "/health", "/", "/api", "/openapi.json", "/api/openapi.json"],
  // Multi-tenant memory / threads: bind Mastra resourceId to Better Auth user id
  // (docs: mapUserToResourceId — prevents client-supplied resourceId spoofing).
  mapUserToResourceId: (user) => {
    const id =
      (user as { user?: { id?: string }; id?: string } | null)?.user?.id ??
      (user as { id?: string } | null)?.id;
    return typeof id === "string" && id.length > 0 ? id : undefined;
  }
});

export const mastra = new Mastra({
  server: {
    auth: mastraAuth,
    cors: {
      // Studio / browser clients with cookie sessions
      origin: process.env.VITE_WEB_URL?.trim() ?? "http://localhost:3000",
      credentials: true
    },
    apiRoutes: [
      chatRoute({
        path: "/chat/:agentId",
        version: "v6",
        defaultOptions: {
          untilIdle: { maxIdleMs: 10 * 60_000 }
        }
      })
    ]
  },
  /**
   * Leave instance `backgroundTasks` off (Mastra default). Enabling the
   * manager in 1.54 injects `_background` on every tool schema, including
   * client HITL tools with no `execute`. Detect/organize/resume/mail opt in
   * on the tool (`background.enabled`) and start via `run.startAsync()`.
   * @see https://mastra.ai/docs/long-running-agents/background-tasks
   */
  workflows: {
    detectStacksWorkflow,
    organizeStacksWorkflow,
    resumeImportWorkflow,
    mailProcessWorkflow,
    mailClassifyWorkflow,
    mailReplyWorkflow,
    mailJobHarvestWorkflow,
    applyPackageWorkflow,
    todayLetterWorkflow
  },
  agents: {
    stackCategorizerAgent: createStackCategorizerAgent(),
    hubSupervisor: createHubSupervisor(),
    resumeImportExtractor: createResumeImportExtractorAgent(),
    mailClassifierAgent: createMailClassifierAgent(),
    mailReplyAgent: createMailReplyAgent(),
    jobNotifierMailExtractor: createJobNotifierMailExtractorAgent(),
    jobPageExtractor: createJobPageExtractorAgent(),
    jobPreferenceMatchScorer: createJobPreferenceMatchScorerAgent(),
    jobAgentTake: createJobAgentTakeAgent(),
    searchBriefWriter: createSearchBriefWriterAgent(),
    todayLetterWriter: createTodayLetterWriterAgent(),
    crmApplicationMatcher: createCrmApplicationMatcherAgent(),
    crmStageAdvisor: createCrmStageAdvisorAgent(),
    providerPingAgent: createProviderPingAgent(),
    applyPackageAgent: createApplyPackageAgent()
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
