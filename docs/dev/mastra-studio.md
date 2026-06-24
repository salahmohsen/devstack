# Mastra Studio — Local Dev Workflow

**Status:** Dev-only for **agents / workflows / tools / memory** browsing.
**Observability is cloud-only** — use the Mastra Cloud Studio at
<https://mastra.ai> (see §"Observability" below). The local Studio's
Observability tab is intentionally empty in this setup.

Mastra Studio is a UI for interactively building, testing, and managing
agents, workflows, tools, and memory threads. It runs locally on port
`4111` and talks to a Mastra server's HTTP API.

Docs: <https://mastra.ai/docs/studio/overview>

## Start Studio

From the repo root, in a second terminal (alongside `pnpm dev`):

```bash
pnpm run dev:studio
```

The script wraps `mastra studio`, which boots the Studio UI on
<http://localhost:4111>. The CLI is the standalone `mastra` package (not
`@mastra/cli`) and is installed at the workspace root as a devDependency.

## Connect Studio to the Hono dev server

The Hono dev server (`apps/server`) already mounts Mastra via `@mastra/hono`
and exposes every endpoint Studio consumes
(`/api/agents`, `/api/tools`, `/api/workflows`, `/api/vectors`,
`/api/memory/threads`, `/api/observability`, etc.).

The `dev:studio` script passes `--server-host localhost --server-port 5001`,
so the Studio connects to the Hono dev server at
<http://localhost:5001> with the default `/api` prefix automatically — no
further configuration is required. If you ever need to repoint it (e.g. the
Hono dev server is on a different port), override the values in the
Studio's **Settings** page, or pass `--server-host` / `--server-port` on the
command line.

The Hono CORS layer already allows `MASTRA_STUDIO_URL` (default
`http://localhost:4111`) plus the `x-mastra-client-type` header Studio
sends, so no further wiring is needed.

If you prefer the default port (`4111`), either stop the Hono dev server
first or set `VITE_SERVER_URL` to a different port so the two don't collide.
We standardise on 5001/4111 to keep both running side by side.

## What you can do in Studio

- **Agents** — chat with `portfolioAgent` and `identityAgent`; switch models
  and tune temperature/top-p live; follow tool calls and reasoning steps;
  stream follow-up messages in the same thread.
- **Workflows** — visualise `refresh-identity` as a graph; run it with a
  custom `inputData`; watch step transitions; inspect traces with raw JSON
  outputs and any errors.
- **Tools** — run a tool in isolation (e.g. `fetch-repo-readme`,
  `update-identity-facet`) to verify its schema and side effects before
  wiring it into an agent.
- **Memory** — browse threads and messages in the D1 store; inspect
  working-memory snapshots; trigger semantic recall queries.
- **Observability** — **not available in the local Studio.** Traces ship
  to Mastra Cloud via `MastraPlatformExporter`. To view traces, open the
  [Mastmloud Studio](https://mastra.ai) and find the project for
  token `MASTRA_PLATFORM_ACCESS_TOKEN` (project ID `MASTRA_PROJECT_ID`).
  For traces to show up there, the env var must be set in `packages/env/.env`
  and the dev server must be restarted. The exporter auto-disables when
  the token is missing, so a blank token is not an error — it just means
  no traces are shipped. If you do open the local Studio and click the
  Observability tab, the underlying `/api/observability/*` calls will
  return 500 because the dev server has no local observability storage
  (intentional). Ignore the 500s in the dev log.

## Cloud Studio at `<slug>.studio.mastra.cloud`

The cloud Studio **intentionally shows "No Agents yet", "No Workflows yet",
"No Tools yet"** for this project. This is by design, not a bug.

The deployed server at `https://personal-hub.studio.mastra.cloud` is the
**stub** built from `src/mastra/index.ts` (the gitignored deploy stub).
It registers zero agents/workflows/tools — its only purpose is to push the
corrected project name, project ID, and env vars to Mastra Cloud via
`mastra studio deploy`. See the file's own header comment for the full
rationale.

The real Mastra instance (with `identityAgent`, `portfolioAgent`,
`refreshIdentityWorkflow`, all GitHub / identity tools) lives in
`packages/ai/src/mastra/index.ts` and is mounted into the Hono app at
`apps/server/src/app.ts:23` via `@mastra/hono`. That instance is deployed
via `pnpm run deploy` (wrangler) to your Cloudflare account, not to
Mastra Cloud. The two deployments are independent — the cloud Studio
reads from its own (empty) deployed Mastra and never proxies to the
Hono app.

Consequence: the cloud Studio's agents/workflows/tools tabs are empty by
construction. Traces DO show up at the cloud observability surface
(`https://observability.mastra.ai`) because the Hono app's Mastra
instance uses `MastraPlatformExporter` directly — it ships spans/logs
independent of any Studio deployment.

**If you want the cloud Studio to show your project's agents/workflows,
the stub would have to bundle the real Mastra instance** (not just an
empty `new Mastra({ storage: new InMemoryStore() })`). That requires
deploying the full `packages/ai/src/mastra/index.ts` as a Cloudflare
Worker with D1 bindings, env vars (OpenCode, Ollama, MASTRA_PROJECT_ID,
etc.), and the Hono stack — significant refactor and a duplicate
deployment. Recommended: keep the Studio for observability only, use
the Hono app's `/api/agents/*` and `/api/workflows/*` routes for
runtime interactions. See [ADR-0004](../adr/0004-mastra-embedded-in-hono.md)
for why this architecture is intentional.

## Why this is dev-only

- `MASTRA_STUDIO_URL` is added to the CORS allowlist without auth; the
  Studio is intended for `localhost` use.
- `mastra studio` is a debugging tool, not a production server. For deployed
  environments the Hono app handles real traffic; the Studio is a UI, not an
  API surface.
- The `.env.example` default (`http://localhost:4111`) is safe to keep in
  the repo — CORS only echoes allowed origins back, it never opens the
  server up to the public.

## Related

- [`docs/superpowers/specs/2026-06-22-mastra-ai-design.md`](../superpowers/specs/2026-06-22-mastra-ai-design.md)
  — design spec that introduces the agents/workflows/memory Studio consumes.
- [`docs/adr/0004-mastra-embedded-in-hono.md`](../adr/0004-mastra-embedded-in-hono.md)
  — why Mastra is mounted inside the Hono app rather than deployed as a
  separate worker (relevant: it is the same Hono process Studio talks to).
- [`docs/adr/0008-replace-mastra-storage-exporter.md`](../adr/0008-replace-mastra-storage-exporter.md)
  — previous observability decision (now superseded by the Mastra Cloud path).
- [`docs/adr/0010-observability-pg-via-composite-storage.md`](../adr/0010-observability-pg-via-composite-storage.md)
  — rejected attempt to use a local Postgres v-next observability storage.
- [`.agents/mastra.md`](../../.agents/mastra.md) — framework reference.
- [Mastra Cloud Studio](https://mastra.ai/docs/studio/overview) — the
  hosted UI where traces are viewed in this setup.
