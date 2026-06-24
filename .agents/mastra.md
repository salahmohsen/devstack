# Mastra AI — Research Findings

Captured from [Mastra docs](https://mastra.ai) (context7 ID: `/mastra-ai/mastra`) on
2026-06-22. Reference for designing the portfolio AI integration.

> **Why this document exists.** Before any code is written, we collected every
> Mastra concept the rest of this plan depends on. The sections below mirror the
> shape of the eventual implementation: framework overview, primitives,
> Cloudflare deployment, storage, RAG, and integrations relevant to the
> portfolio goals (GitHub-aware agent, identity workflow, content suggestions,
> future resume/PDF/email).

---

## 1. What Mastra Is

- **Opinionated TypeScript framework** for building AI applications and agents.
- **Primitives:** `Agent`, `Workflow`, `Tool`, `Memory`, `RAG` (document chunking
  - vector store), `Evals`, `Observability`.
- **Deployment:** standalone server, embedded inside an existing app, or
  serverless via `@mastra/deployer-cloudflare`.
- **Model routing:** one interface for 40+ providers (OpenAI, Anthropic,
  Gemini, etc.) via the Mastra model gateway, e.g. `mastra/openai/gpt-5-mini`.

## 2. Core Primitives

### 2.1 Agent

```ts
import { Agent } from "@mastra/core/agent";

export const portfolioAgent = new Agent({
  id: "portfolio-agent",
  name: "Portfolio Agent",
  instructions: "You are ...",            // system prompt
  model: "anthropic/claude-sonnet-4-5",   // gateway-style id
  tools: { /* createTool(...) */ },
  memory: new Memory({ ... }),           // optional
});
```

Key fields:

- `id`, `name`: stable identity used by the registry and `mastra.getAgent(id)`.
- `instructions`: system prompt. Concise, role-specific.
- `model`: gateway string (`provider/model`) or a `MastraModelConfig` object.
- `tools`: object map of `createTool(...)` outputs. Tool descriptions are
  routing-critical — they tell the LLM when to call each tool.
- `memory`: optional `Memory` instance (last messages, semantic recall, working
  memory).
- `agents`, `workflows`: for an agent network (router pattern).

Two execution methods:

- `agent.generate(prompt)` → single response.
- `agent.stream(prompt)` → async iterable of chunks (for chat UIs).

### 2.2 Tool

```ts
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const fetchRepoReadmeTool = createTool({
  id: "fetch-repo-readme",
  description:
    "Fetches the README.md of a GitHub repository. Use when the user asks about a specific repo.",
  inputSchema: z.object({
    owner: z.string(),
    repo: z.string(),
    ref: z.string().optional()
  }),
  outputSchema: z.object({ content: z.string().nullable() }),
  execute: async (inputData, context) => {
    // inputData is the parsed input
    // context has runtime helpers (mastra, agent, requestContext, etc.)
    const result = await fetchReadme(inputData);
    return { content: result };
  }
});
```

Notes:

- `id` is referenced by agents/workflows; keep it kebab-case and unique.
- `description` is what the LLM sees when deciding whether to call the tool —
  be specific about _when_ to use it.
- `inputSchema` / `outputSchema` are Zod by default (Valibot, ArkType also OK).
- `execute` receives `(inputData, context)`. Use `context.mastra` to call
  other agents/tools, `context.agent` for suspend/resume on the current
  agent, `context.requestContext` for request-scoped values.
- Optional `suspendSchema` + `resumeSchema` enable human-in-the-loop approval
  (e.g., "do you want to send this email?").

### 2.3 Workflow

```ts
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

const gatherRepos = createStep({
  id: "gather-repos",
  inputSchema: z.object({ username: z.string() }),
  outputSchema: z.object({ repos: z.array(z.object({ name: z.string(), readme: z.string().optional() })) }),
  execute: async ({ inputData, mastra }) => {
    // call tools, agents, DB, anything
    return { repos: [...] };
  }
});

export const buildIdentityWorkflow = createWorkflow({
  id: "build-identity",
  inputSchema: z.object({ username: z.string() }),
  outputSchema: z.object({ identity: z.string() })
})
  .then(gatherRepos)
  .commit();
```

Suspend/resume (for long-running or approval flows):

```ts
const approvalStep = createStep({
  id: "request-approval",
  inputSchema: z.object({ summary: z.string() }),
  outputSchema: z.object({ approved: z.boolean() }),
  resumeSchema: z.object({ approved: z.boolean() }),
  suspendSchema: z.object({ message: z.string() }),
  execute: async ({ inputData, resumeData, suspend, bail }) => {
    if (resumeData?.approved) return { approved: true };
    if (resumeData?.approved === false) return bail({ message: "rejected" });
    return suspend({ message: `Approve? ${inputData.summary}` });
  }
});
```

Run lifecycle:

- `const run = await workflow.createRun();`
- `await run.start({ inputData })` → status `success` | `suspended` | `failed`.
- If `suspended`: `await run.resume({ step, resumeData })`.

### 2.4 Memory

```ts
import { Memory } from "@mastra/memory";

new Memory({
  storage:    new D1Store({ binding: env.DB }),   // or PostgresStore, LibSQLStore
  vector:     new CloudflareVector({ ... }),      // or PgVector, LibSQLVector
  embedder:   "openai/text-embedding-3-small",
  options: {
    lastMessages: 20,                              // recent chat context
    semanticRecall: { topK: 3, messageRange: { before: 2, after: 1 } },
    workingMemory: { enabled: true, template: "<user>...</user>" }
  }
});
```

Three memory dimensions:

- **Conversation history (`lastMessages`)** — short-term, exact.
- **Semantic recall** — embed past messages, retrieve similar on query.
- **Working memory** — structured user profile the agent updates over time
  (the "identity" piece in our portfolio use case).

## 3. Cloudflare Deployment

### 3.1 Two Integration Modes

**A. Standalone Mastra worker** (uses `@mastra/deployer-cloudflare`):

```ts
import { Mastra } from "@mastra/core";
import { CloudflareDeployer } from "@mastra/deployer-cloudflare";

export const mastra = new Mastra({
  deployer: new CloudflareDeployer({
    name: "portfolio-mastra",
    vars: { NODE_ENV: "production" },
    kv_namespaces: [{ binding: "CACHE", id: "..." }],
    d1_databases: [{ binding: "DB", database_name: "...", database_id: "..." }]
  }),
  server: {
    apiRoutes: [
      registerApiRoute("/chat", {
        method: "POST",
        handler: async (c) => {
          const mastra = c.get("mastra");
          const agent = await mastra.getAgent("portfolio-agent");
          return c.json(await agent.generate(await c.req.text()));
        }
      })
    ]
  }
});
```

`@mastra/deployer-cloudflare` bundles the app and emits a wrangler config.
Best when Mastra is the _only_ thing the worker does (own subdomain/route).

**B. Embed inside our existing Hono app** (uses `@mastra/hono` adapter):

```ts
import { Hono } from "hono";
import { MastraServer } from "@mastra/hono";
import { env } from "cloudflare:workers";
import { mastra } from "./mastra"; // fully initialized with env-resolved D1 binding

const app = new Hono<{ Bindings: HonoBindings; Variables: HonoVariables }>();
const server = new MastraServer({ app, mastra });
await server.init(); // AWAITED at module load — see ADR-0007
// then keep using the same Hono app for our own oRPC routes
```

This is the right mode for **portfolio-v2**: the Hono app in `apps/server`
already owns auth, oRPC, webhooks, and the WebSocket relay. Mounting Mastra
into the same Hono app shares `Cloudflare.Env` (D1, KV, Durable Objects,
Neon), keeps CORS/auth unified, and avoids a second deployable.

**Critical pattern (ADR-0007):** `MastraServer.init()` calls `app.get/post/...`
to register routes. Hono's router matcher is built lazily on the first
`app.fetch()` call; any route added after that throws
`Can not add a route since the matcher is already built.` Therefore
`init()` MUST be awaited at module load, BEFORE the first request hits
the Hono app. The fire-and-forget pattern (`void mountMastra(app)`) and
the lazy per-request pattern both fail. In Cloudflare Workers, the env
is reachable at module load via `import { env } from "cloudflare:workers"`,
which is what makes module-load init possible.

### 3.2 Cloudflare Bindings in API Routes

```ts
import { env } from "cloudflare:workers";
import { registerApiRoute } from "@mastra/core/server";

registerApiRoute("/bindings", {
  method: "GET",
  handler: async (c) => {
    await env.GITHUB_CACHE_KV.put("status", "ok");
    return c.json({ status: await env.GITHUB_CACHE_KV.get("status") });
  }
});
```

Implication for us: the Hono context already exposes `c.env.GITHUB_CACHE_KV`
and `c.env.GITHUB_SIGNAL_RELAY`. Mastra and our existing code can share the
same bindings without a new wiring layer.

### 3.3 Storage on Cloudflare

| Layer         | Adapter                                     | Where it lives                     |
| ------------- | ------------------------------------------- | ---------------------------------- |
| KV cache      | (existing) `GITHUB_CACHE_KV`                | wrangler binding                   |
| Thread/memory | `D1Store` from `@mastra/cloudflare-d1`      | wrangler binding `DB` (new)        |
| Vectors       | `CloudflareVector` from `@mastra/vectorize` | wrangler binding `VECTORIZE` (new) |
| Durable state | (existing) `GITHUB_SIGNAL_RELAY` DO         | wrangler binding                   |

D1Store usage:

```ts
import { D1Store } from "@mastra/cloudflare-d1";
const storage = new D1Store({ binding: env.DB, tablePrefix: "mastra_" });
// On first use in a Worker, call `await storage.init()` to create tables.
```

`D1Store` handles threads, messages, workflow snapshots, traces, and evals.

Vectorize usage (sibling of the RAG pipeline):

```ts
import { CloudflareVector } from "@mastra/vectorize";
const vector = new CloudflareVector({
  apiToken: env.CF_API_TOKEN,
  accountId: env.CF_ACCOUNT_ID,
  indexName: "portfolio-identity"
});
```

### 3.4 Neon as an Alternative

We already use Neon Postgres for the app DB. Mastra also ships
`PostgresStore` and `PgVector`:

```ts
import { PostgresStore } from "@mastra/pg";
import { PgVector } from "@mastra/pg";
```

Pros: one DB, pgvector extension. Cons: latency from the Worker to Neon over
WebSockets is higher than D1 in-region. For _thread/memory_ storage D1 is
fine; for _RAG_ (heavier reads), Neon + PgVector is competitive because we
already have the connection pool. Recommendation: **D1 for memory, Neon +
PgVector for embeddings**, reusing the existing `createDb()` per request.

## 4. RAG (Document Ingestion)

```ts
import { MDocument } from "@mastra/rag";
import { embed, embedMany } from "ai";
import { ModelRouterEmbeddingModel } from "@mastra/core/llm";

const doc = MDocument.fromText(readmeText);
const chunks = await doc.chunk({ strategy: "recursive", size: 512, overlap: 50 });
const { embeddings } = await embedMany({
  model: new ModelRouterEmbeddingModel("openai/text-embedding-3-small"),
  values: chunks.map((c) => c.text)
});

await vectorStore.createIndex({ indexName: "repos", dimension: 1536 });
await vectorStore.upsert({
  indexName: "repos",
  vectors: embeddings,
  metadata: chunks.map((c) => ({ text: c.text, source: c.metadata?.source }))
});
```

Agent side:

```ts
import { createVectorQueryTool } from "@mastra/rag";
const searchRepos = createVectorQueryTool({
  vectorStoreName: "pgVector", // matches `mastra.vectors.pgVector`
  indexName: "repos",
  model: new ModelRouterEmbeddingModel("openai/text-embedding-3-small"),
  databaseConfig: { pgvector: { minScore: 0.7, ef: 200, probes: 10 } }
});
```

For our use case, the index sources are: `README.md`, `AGENTS.md` /
`CLAUDE.md` / `.cursorrules`, and selected source files (top-N by
importance). Re-index on webhook (`push` event to default branch).

## 5. Observability

```ts
import { Observability, MastraPlatformExporter, SensitiveDataFilter } from "@mastra/observability";

new Observability({
  configs: {
    default: {
      serviceName: "portfolio-mastra",
      exporters: [
        new MastraPlatformExporter() // Auto-disables when MASTRA_PLATFORM_ACCESS_TOKEN is unset.
      ],
      spanOutputProcessors: [new SensitiveDataFilter()]
    }
  }
});
```

- Traces, logs, and metrics ship to the hosted Mastra observability surface
  at `https://observability.mastra.ai` via `MastraPlatformExporter`. The
  exporter reads `process.env.MASTRA_PLATFORM_ACCESS_TOKEN` at construction
  time and **auto-disables** (no-op) when the env var is missing — so dev
  and production share the same exporter list, and a missing token is not
  an error.
- **The local Studio observability tab is intentionally empty in this
  setup.** To view traces, open the Mastra Cloud project at
  `https://mastra.ai`. Traces appear with `serviceName=portfolio-mastra`
  once a real `MASTRA_PLATFORM_ACCESS_TOKEN` is configured.
- Cloudflare's platform observability (`apps/server/wrangler.jsonc:21-35`)
  still captures every span with `head_sampling_rate = 1`, independent of
  Mastra. The Mastra Cloud path is additive, not a replacement.
- Spans expose `observe.span(name, fn)` inside tool `execute` for
  fine-grained tracing. Sensitive data is redacted by `SensitiveDataFilter`
  before any exporter (local or platform) sees it.
- **No local observability storage.** Previous attempts to back the
  `observability` domain with a Postgres v-next storage
  (`@mastra/pg::ObservabilityStoragePostgresVNext`) required the `pg` driver,
  which cannot open TCP sockets inside `workerd` (the Vite+ dev server runs
  in Miniflare, which emulates Cloudflare Workers). See ADR-0008 (now
  superseded) and ADR-0010 (rejected) for the full history. The Mastra
  Cloud path sidesteps the runtime problem entirely — there is no
  observability domain in the local storage, no `pg` driver, no
  `pg-cloudflare` adapter to wire.
- **The cloud Studio at `<slug>.studio.mastra.cloud` shows "No Agents
  yet", "No Workflows yet", "No Tools yet" by design.** The deployed
  stub at `src/mastra/index.ts` (gitignored) is `new Mastra({ storage:
new InMemoryStore() })` — empty by construction. The real Mastra
  instance lives in `packages/ai/src/mastra/index.ts` and is mounted
  into the Hono app via `@mastra/hono`; the Hono worker is deployed
  via wrangler to your Cloudflare account, never to Mastra Cloud. The
  cloud Studio reads from its own (empty) deployed Mastra and does not
  proxy to the Hono app. Traces ship to
  `https://observability.mastra.ai` directly via `MastraPlatformExporter`
  regardless. Full rationale in
  `docs/dev/mastra-studio.md` §"Cloud Studio". To make the cloud Studio
  show your agents/workflows would require bundling the full real
  Mastra instance into the deploy stub (with D1 binding, env vars,
  Hono stack) — significant refactor and a duplicate deployment; not
  recommended for this architecture.

## 6. Model Gateway

```ts
const agent = new Agent({ model: "anthropic/claude-sonnet-4-5" });
const agent = new Agent({ model: "mastra/openai/gpt-5-mini" });
const agent = new Agent({ model: "openai/gpt-5" });
```

`MASTRA_PLATFORM_ACCESS_TOKEN` enables Mastra Cloud; without it, set
`OPENAI_API_KEY` / `ANTHROPIC_API_KEY` directly in env. Model ID format:
`[gateway-id]/[provider]/[model]`.

## 7. Integrations Relevant to Portfolio Goals

| Goal                                   | Mastra primitive                   | Adapter / pattern                                                                     |
| -------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------- |
| GitHub repo README + .agents ingestion | `createTool` + workflow            | Wrap `getRepoFileContent` + octokit                                                   |
| Identity that updates on changes       | `Memory` working memory            | Re-run workflow on webhook, update working memory template                            |
| Content suggestions                    | Agent + vector search tool         | RAG over repo chunks                                                                  |
| Resume chat (future)                   | Agent + streaming                  | `agent.stream()` from oRPC route                                                      |
| PDF generation (future)                | Tool that calls a renderer         | `react-email/render` for HTML, headless Chrome or `@react-pdf/renderer` for PDF (TBD) |
| Send resume via email (future)         | Tool wrapping existing `sendEmail` | Same `RESEND_API_KEY` from `ENV_SERVER`                                               |

## 8. Source Reputation / Versions

- Library IDs: `/mastra-ai/mastra` (16,896 snippets, score 85) and
  `/llmstxt/mastra_ai_llms_txt` (7,378 snippets, score 85).
- High source reputation, benchmark-aligned. Doc snippets referenced above
  are current as of the snapshot pulled on 2026-06-22.
- Before locking package versions, re-run `npx ctx7@latest library "Mastra"`
  and pick the latest `^x.y.z` compatible with Node 20+ (Workers) and
  Hono 4 (we already use Hono 4.12).

## 9. Open Questions to Resolve During Design

1. **Storage location**: D1 (Workers-local, fast) vs Neon (one DB, RLS-aware)
   for threads/messages. Default: D1 for memory, Neon for embeddings.
2. **Embedding provider**: OpenAI `text-embedding-3-small` (cheap, 1536-d) vs
   `voyage-context-3` (better for long context) vs `fastembed` (local, no
   external API). Default: OpenAI for now, abstract behind `embedder` string.
3. **Vector store**: Vectorize (Workers-native) vs PgVector (Neon). Default:
   Vectorize for speed, but PgVector is acceptable.
4. **Identity model**: working memory template vs a dedicated Drizzle table.
   Working memory keeps updates in-step with conversations; a table gives
   queryable history. Default: working memory + a `portfolio_identity` table
   for the materialized snapshot.
5. **UI surface**: chat on dashboard home (future). For now, agent is
   consumed by oRPC + suggested-action endpoints.
