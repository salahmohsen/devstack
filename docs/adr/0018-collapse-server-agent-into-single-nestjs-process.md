# Collapse Server and Agent into a Single NestJS Process

Migrating off Cloudflare, we considered keeping `server` and `agent` as
separate Docker containers (matching the CF three-Worker topology) vs.
collapsing them into one NestJS process via `@mastra/nestjs`. We chose the
collapsed architecture: `MastraModule.register({ mastra })` mounts all
agent/workflow/tool/MCP endpoints at `/agent/*` inside the NestJS app.

The Cloudflare split was platform-imposed (per-Worker isolate, per-Worker
subrequest budget). On self-hosted Docker there is no such constraint.

Reasons we picked collapse:

- **Observability.** `OtelBridge` "inherits context from active OTEL
  spans," giving one distributed trace across the NestJS request →
  Mastra agent → tools → LLM calls. Across separate containers the
  trace would split and require manual `traceparent` header forwarding
  on every `fetch()` in the inter-container HTTP proxy. The user
  explicitly asked to retain every Mastra observability feature.
- **Streaming.** Mastra's NestJS adapter exposes `/agent/api/agents/:id/stream`
  directly, and controllers can inject `@Inject(MASTRA) mastra` and call
  `agent.stream()` returning an async generator. The standalone
  alternative required a create-run → `?runId=` stream indirection and
  an ~85-line `AgentService` HTTP proxy. Both deleted.
- **All Mastra features intact.** `MastraModule.register` options
  include `rateLimitOptions`, `shutdownOptions`, `streamOptions`,
  `tracingOptions`, `mcpOptions`, `taskStore`, `customRouteAuthConfig`,
  plus the `Mastra` instance keeps `observability`, `storage`,
  `logger`, `scorers`, `workflows`, `agents`. Nothing is lost.
- **Operational simplicity.** One container, one Dockerfile, one Traefik
  route, one CORS/CSP config. No `agent.salahmohsen.com` subdomain.

Trade-off we accepted: no failure isolation. A hanging LLM call inside
`agent.stream()` blocks a NestJS worker. Concurrency is single-digit on
a personal portfolio, so this is acceptable. If scaling ever demands
extraction, the `Mastra` instance is constructed in
`apps/agent/src/mastra/index.ts` as a plain object with no NestJS
imports — it could be served via `mastra start` in a separate
container later without changing NestJS code.
