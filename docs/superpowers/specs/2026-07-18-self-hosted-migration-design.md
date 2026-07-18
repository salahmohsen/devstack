# Self-Hosted Migration Design

**Status:** Approved by user on 2026-07-18.

## Goal

Migrate `personal-hub` from Cloudflare Workers to self-hosted Docker deployment on Dokploy. Keep three separate Node.js apps (web, server, agent) behind Traefik. Replace all Cloudflare bindings (KV, R2, Durable Objects, service bindings, `waitUntil`) with Node.js equivalents (Redis, MinIO/S3, Socket.IO, HTTP fetch, direct await).

## Architecture

Three Docker containers behind Traefik, plus three infrastructure containers (Postgres, Redis, MinIO):

| App           | Stack                      | Build                          | Output                     | Run                             |
| ------------- | -------------------------- | ------------------------------ | -------------------------- | ------------------------------- |
| `apps/web`    | TanStack Start (Nitro)     | `vp run -v --filter web build` | `.output/server/index.mjs` | `node .output/server/index.mjs` |
| `apps/server` | Hono + `@hono/node-server` | `vp pack`                      | `dist/index.mjs`           | `node dist/index.mjs`           |
| `apps/agent`  | Mastra                     | `mastra build`                 | `.mastra/output/index.mjs` | `node .mastra/output/index.mjs` |

PostgreSQL hosts two databases (created by `scripts/init-databases.sh`): `personal_hub` (Drizzle/Neon Drizzle) and `mastra_agent` (Mastra `PostgresStore`).

Deployment target: **Dokploy** with Traefik labels (`PathPrefix` per app). The existing `docker-compose.coolify.yaml` (Coolify-specific with `SERVICE_URL_*` env vars) is deleted and replaced with **two new compose files**:

- **`docker-compose.yaml`** — full-stack app definitions for Dokploy (3 app containers + 3 infra containers, all with Traefik labels)
- **`docker-compose.prod.yml`** — Dokploy production override (extending `docker-compose.yaml` with production env vars, port mappings, and Traefik routing rules)

Dokploy reads either file at deploy time (`docker-compose.yaml` for local staging, `docker-compose.prod.yml` as the active production compose). Phase 5 verification curls `docker compose -f docker-compose.prod.yml build/up/ps` explicitly using the prod override.

The existing `docker-compose.infra.yml` (created in Task 1) stays as the **dev-only** infrastructure file (postgres + redis + minio, no app containers) — used in Phases 2-4 for local development.

Migration is **big-bang** on the `self-hosted-migration` branch. CF deployment stops working after merge; that's acceptable because the user has already merged dev-resilience fixes (`ada51fe`) that keep CF deployment running in the meantime.

## Binding Replacements

| CF binding                             | Node.js replacement                                                       | Interface preserved?                                        |
| -------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `GITHUB_CACHE_KV` (KV)                 | Redis via ioredis + `createRedisCacheAdapter`                             | Yes — `GitHubCacheKv` shape                                 |
| `MEDIA_BUCKET` (R2)                    | MinIO via `files-sdk/s3` adapter                                          | Yes — `Files` structurally matches `OrpcContextMediaBucket` |
| `GITHUB_SIGNAL_RELAY` (Durable Object) | Socket.IO + `@socket.io/redis-adapter`                                    | New — replaces DO `broadcast` semantics                     |
| `AGENT_WORKER` (service binding)       | HTTP fetch to `AGENT_WORKER_URL` env                                      | Yes — existing URL fallback path completes                  |
| `executionCtx.waitUntil()`             | Fire-and-forget via `void task` (Node.js event loop outlives the request) | N/A — pattern becomes unnecessary                           |

### Key adapters

**Redis cache adapter** (`packages/github/src/infrastructure/cache/redis-cache-adapter.ts`, new) implements `GitHubCacheKv` so `packages/github/src/infrastructure/cache/github-cache.ts` doesn't change. `put` uses ioredis options object form: `redis.set(key, value, { EX: ttl })` (validated against ioredis docs).

**S3 media adapter** (`packages/api/src/lib/storage/index.ts`, modified) swaps `files-sdk/r2` for `files-sdk/s3`. `Files` already structurally matches `OrpcContextMediaBucket` (`put`/`get`/`delete` with matching signatures), so `packages/api/src/routers/resume.router.ts` and other consumers don't change.

**Socket.IO gateway** (`apps/server/src/github-gateway.ts`, new) replaces the Durable Object. Cross-instance broadcast via `@socket.io/redis-adapter` (validated against official Socket.IO docs, including the official Hono+Node.js integration pattern). Module-level `_broadcastSignals` export lets the webhook handler emit signals without `globalThis` hacks.

**Agent worker fetch** (`packages/api/src/lib/agent/worker.ts`, simplified) drops the `Fetcher` type and always uses HTTP fetch with `duplex: "half"` for streaming bodies (per the existing code's `@ts-expect-error` comment). Note: the `OrpcContextAgentWorker` type in `packages/core/src/orpc-context/index.ts` uses `RequestInfo` (not CF `Fetcher`), so it survives the migration **unchanged** — do not modify it.

### `OrpcContextGithubBinding` type change

```diff
 export type OrpcContextGithubBinding = {
-  executionContext?: { waitUntil(promise: Promise<unknown>): void };
   kv?: { /* unchanged */ };
-  signalRelay?: { /* Durable Object stub shape */ };
+  broadcast?: (signalKeys: string[]) => void;
 };
```

### `NodeRuntime` shape (new)

```typescript
export type NodeRuntime = {
  redis: Redis;
  files: Files; // structurally matches OrpcContextMediaBucket
  broadcastSignals: (keys: string[]) => void;
  agentWorkerUrl: string | undefined;
};
```

Built once at server boot by `initRuntime()` in `apps/server/src/runtime-context.ts`. Per-request `createContext()` accepts the `NodeRuntime` as a parameter instead of reading `context.env.*`.

## Migration Phases

Five phases, each verifiable before the next starts.

### Phase 1: Server build pipeline → Node.js (BLOCKING)

- Delete `apps/server/vite.config.ts` (426 lines of CF shims), `wrangler.jsonc`, `wrangler.dev.jsonc`, `src/worker.ts`, `worker-configuration.d.ts`
- Create new `apps/server/vite.config.ts` with `pack` config block (tsdown-based, ESM, no CF shims)
- Create `apps/server/src/node.ts` — `serve(app.fetch, { port })` from `@hono/node-server`
- Add `/health/live` and `/health/ready` routes to `apps/server/src/app.ts` (Phase 1 verification depends on them — moved from Phase 5 to here). The existing `app.ts` only registers `app.get("/")`, so the health routes don exist yet — Phase 1 creates them
- Update `apps/server/package.json` — drop wrangler/cross-env/cf scripts; add `build: "vp pack"`, `dev: "vp dev"` (or fallback to `tsx watch src/node.ts`), `start: "node dist/index.mjs"`; add deps `@hono/node-server`, `socket.io`, `@socket.io/redis-adapter`, `ioredis`
- Verify: `vp pack` produces `dist/index.mjs`, server boots on `:5100`, `/health/live` returns 200

### Phase 2: Replace CF bindings in `createContext`

- Modify `packages/api/src/lib/context/hono/create-context.ts` — accept `NodeRuntime` parameter instead of reading `context.env.*`; remove `executionCtx`
- Modify `packages/api/src/lib/agent/worker.ts` — drop `Fetcher`, always HTTP fetch
- Modify `packages/api/src/lib/storage/index.ts` — `files-sdk/r2` → `files-sdk/s3`
- Modify `apps/web/src/server/files-gateway.ts` — drop `cloudflare:workers` import, call `createFiles()` (no args). **Note**: this touches the web app despite Phase 5 being titled "Web migration + deployment"; Phases 2 and 5 both touch `apps/web/`. Phase 2 only changes this one file; Phase 5 removes wrangler/cf deps and the Dockerfile touch.
- Modify `packages/github/src/runtime/bindings.ts` — **fully drop all CF types**: `executionContext` field (from `GitHubRuntimeBindings`), `ExecutionContextLike` type, `DurableObjectStubLike` type, `DurableObjectNamespaceLike` type, and the `signalRelay` field. Replace `signalRelay` with `broadcast?: (signalKeys: string[]) => void`. Without this, the final `grep -r "DurableObject"` cleanup gate in Phase 5 fails.
- Modify `packages/github/src/webhooks/handle-github-webhook.ts` — replace DO broadcast (`runtime.signalRelay?.idFromName("global").get(id).fetch("/broadcast")`) with `runtime.broadcast?.(signalKeys)` callback. Also drop the `input.runtime.executionContext?.waitUntil(task)` call (line ~81) — fire-and-forget via `void` since Node.js event loop outlives the request.
- Modify `apps/server/src/app.ts:168` (`executionContext: c.executionCtx` in the webhook handler's `runtime` object) — drop the `executionContext` line entirely since `waitUntil` is no longer needed
- Create `apps/server/src/runtime-context.ts` — builds `NodeRuntime` at boot
- Verify: All four infrastructure containers reachable, `/health/ready` shows all services healthy

### Phase 3: Socket.IO gateway replaces Durable Object

- Create `apps/server/src/github-gateway.ts` — Socket.IO + Redis adapter
- Initialize gateway in `apps/server/src/node.ts` after `serve()`
- Delete `apps/server/src/github-signal-relay.ts` (DO code)
- Verify: Browser connects via `socket.io-client`, broadcast reaches subscribed clients, cross-instance fan-out works

### Phase 4: Agent migration

- Modify `apps/agent/src/mastra/index.ts` — remove `CloudflareDeployer`, `DuckDBStore`, `LibSQLStore`; use `PostgresStore` with `DATABASE_URL` pointing at `mastra_agent` database
- Modify `apps/agent/package.json` — drop CF deps (`@mastra/deployer-cloudflare`, `@mastra/cloudflare-d1`, `@mastra/duckdb`, `@duckdb/node-bindings`, `@mastra/libsql`, `wrangler`); update scripts to `dev: "mastra dev"`, `build: "mastra build"`, `start: "node .mastra/output/index.mjs"`
- Delete `apps/agent/wrangler.jsonc`
- Create `apps/agent/Dockerfile` — `node:25-bookworm-slim`, `mastra build`, `node .mastra/output/index.mjs`
- Verify: Agent builds, boots, exposes `/api/agents`, responding to agent.chat/detectStacks calls from server

### Phase 5: Web migration + deployment

- Delete `apps/web/wrangler.jsonc`
- Modify `apps/web/package.json` — drop `@cloudflare/vite-plugin`, `wrangler`, `cross-env`; simplify `dev` script
- Modify `apps/server/Dockerfile` — port 5000→5100, build via `vp pack`, CMD `node dist/index.mjs`
- Modify `apps/web/Dockerfile` — drop CF-related build args
- Create `docker-compose.yaml` — Dokploy-style with Traefik labels for `/server`, `/agent`, `/`; includes all 6 services (postgres, redis, minio, server, agent, web)
- Create `docker-compose.prod.yml` — production override extending `docker-compose.yaml` with prod env vars and Traefik production routing rules (this is the file Phase 5 verification curls)
- Delete `docker-compose.coolify.yaml`
- Update `packages/env/src/server/env.ts` — add `PORT`, `REDIS_URL`, `S3_*`, `AGENT_WORKER_URL`, `MEDIA_PUBLIC_URL`, `OTEL_SERVICE_NAME`
- Update `packages/env/.env` with dev values
- Create `scripts/migrate-from-neon.sh` (temporary, deleted in cleanup)
- Update `.gitignore`
- Final cleanup: `grep -r "wrangler\|DurableObject\|CloudflareDeployer\|cloudflare:workers"` returns 0 matches
- (Health endpoints `/server/health/live` and `/server/health/ready` already added in Phase 1 — moved earlier so Phase 1 verification can curl them)

## File Changes

### Created

- `apps/server/src/node.ts` — `@hono/node-server` entry point (~30 lines)
- `apps/server/src/runtime-context.ts` — `NodeRuntime` factory + singleton (~80 lines)
- `apps/server/src/github-gateway.ts` — Socket.IO + Redis adapter (~100 lines)
- `apps/server/vite.config.ts` (rewritten) — minimal `pack` config (~30 lines)
- `apps/agent/Dockerfile` — Mastra Node.js build (~50 lines)
- `scripts/migrate-from-neon.sh` — temporary, deleted in cleanup

### Modified

- `apps/server/src/app.ts` — remove `c.env.*` reads, remove DO WebSocket route (~40 lines changed)
- `apps/server/package.json` — scripts + deps
- `apps/server/Dockerfile` — port, build command, CMD
- `packages/api/src/lib/context/hono/create-context.ts` — signature change to accept `NodeRuntime`
- `packages/api/src/lib/agent/worker.ts` — drop `Fetcher`, always HTTP fetch with `duplex: "half"`
- `packages/api/src/lib/storage/index.ts` — swap `files-sdk/r2` → `files-sdk/s3`
- `packages/github/src/runtime/bindings.ts` — fully drop all CF types (`executionContext`, `ExecutionContextLike`, `DurableObjectStubLike`, `DurableObjectNamespaceLike`, `signalRelay`); replace `signalRelay` with `broadcast?: (signalKeys: string[]) => void`
- `packages/github/src/webhooks/handle-github-webhook.ts` — replace DO broadcast with callback
- `apps/web/src/server/files-gateway.ts` — drop `cloudflare:workers` import
- `apps/web/package.json` — drop CF devDeps, simplify `dev` script
- `apps/web/Dockerfile` — drop CF build args
- `apps/agent/src/mastra/index.ts` — swap `CloudflareDeployer` + `LibSQLStore`/`DuckDBStore` for `PostgresStore`
- `apps/agent/package.json` — drop CF deps, update scripts
- `packages/env/src/server/env.ts` — add new env vars
- `packages/env/.env` — add dev values
- `docker-compose.yaml` — rewrite for Dokploy + Traefik
- `packages/core/src/orpc-context/index.ts` — update `OrpcContextGithubBinding` type

### Deleted

- `apps/server/vite.config.ts` (426-line CF version, replaced)
- `apps/server/src/worker.ts`
- `apps/server/src/github-signal-relay.ts`
- `apps/server/wrangler.jsonc`
- `apps/server/wrangler.dev.jsonc`
- `apps/server/worker-configuration.d.ts`
- `apps/web/wrangler.jsonc`
- `apps/agent/wrangler.jsonc`
- `docker-compose.coolify.yaml`
- `scripts/migrate-from-neon.sh` (after final cleanup)

### Kept (already done in Task 1)

- `docker-compose.infra.yml` — dev infrastructure only
- `scripts/init-databases.sh` — creates `mastra_agent` database

## Net line change

- Remove: ~1100 lines (mostly `vite.config.ts` CF shims + Durable Object + wrangler configs)
- Add: ~300 lines (Node.js entry, gateway, runtime-context, rewritten vite.config, Dockerfile)
- Net: **−800 lines** of CF-specific code

## Testing & Validation

Each phase has explicit verification:

### Phase 1

```bash
cd apps/server && pnpm dotenvx run -f ../../packages/env/.env -- vp pack
node dist/index.mjs  # boots on :5100
curl http://localhost:5100/health/live  # {"status":"healthy",...}
```

### Phase 2

```bash
docker compose -f docker-compose.infra.yml up -d
docker compose -f docker-compose.infra.yml exec postgres psql -U admin -l  # mastra_agent listed
curl http://localhost:5100/health/ready  # all checks healthy
```

### Phase 3

```bash
# Browser console (with socket.io-client):
const socket = io("http://localhost:5100", { path: "/api/ws/github-signals" });
socket.emit("subscribe", { keys: ["test-key"] });
socket.on("github-signals", (msg) => console.log("received", msg));
# Expected: receives broadcast when webhook/signal fires
```

### Phase 4

```bash
cd apps/agent && pnpm build  # = mastra build → .mastra/output/index.mjs
DATABASE_URL=postgresql://admin:changeme@localhost:5432/mastra_agent node .mastra/output/index.mjs
curl http://localhost:4111/api/agents  # JSON array of agents
curl http://localhost:5100/rpc/agent.detectStacks --data '{"repoUrl":"..."}'  # 200
```

### Phase 5

```bash
docker compose -f docker-compose.prod.yml build  # 3 images build
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps  # all healthy/started
curl http://localhost:5100/health/ready  # server
curl http://localhost:3000/              # web
curl http://localhost:4111/api/agents    # agent
grep -r "wrangler\|DurableObject\|CloudflareDeployer\|cloudflare:workers" apps/ packages/ --include="*.ts" --include="*.json" --include="*.jsonc"
# Expected: 0 matches
```

### Post-phase validation (per AGENTS.md)

```bash
vp check --filter @tsu-stack/server
vp check --filter @tsu-stack/agent
vp run -w fix  # after multi-package phase
vp run build   # builds all
```

## What's NOT in scope

- Data migration from Neon to local Postgres — handled by temporary `scripts/migrate-from-neon.sh`, deleted after use
- Browser-side WebSocket client switch — tiny change in web app (raw `WebSocket` → `socket.io-client`), verified manually
- Performance/load testing — CF→Node parity is the goal, not performance benchmarking
- TanStack Start prerender work — web already works; only `files-gateway.ts` is touched
- Workspace reorganization (merging `packages/api` into `apps/server`, etc.) — stays as-is

## Risk Profile

| Phase   | Risk                                                                                            | Mitigation                                                                                                    |
| ------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Phase 1 | Highest — `vp pack` config may produce incompatible Node.js bundle                              | Test build output before refactoring; if `vp pack` doesn't work, fall back to `tsx` for dev + `tsc` for build |
| Phase 2 | Medium — 297-line `app.ts` refactor; many procedures use `getDb()` from AsyncLocalStorage scope | Don't touch DB scope logic — only `c.env.*` reads change; `runWithDb` middleware already exists               |
| Phase 3 | Low — additive code following Socket.IO docs and the official Hono+Node.js pattern              | Validated pattern in context7                                                                                 |
| Phase 4 | Low — Mastra's official Node.js deployer path is documented                                     | Drop-in `PostgresStore` swap                                                                                  |
| Phase 5 | Low — `docker-compose.yaml` rewrite is mechanical                                               | Traefik labels validated against existing `docker-compose.yaml` + `docker-compose.coolify.yaml` patterns      |

## Realistic Time Estimate

| Phase                     | Estimate                                                                          |
| ------------------------- | --------------------------------------------------------------------------------- |
| 1 — Server build pipeline | 0.5 day                                                                           |
| 2 — Replace CF bindings   | 0.5 day                                                                           |
| 3 — Socket.IO gateway     | 0.25 day                                                                          |
| 4 — Agent migration       | 0.25 day                                                                          |
| 5 — Web + deployment      | 0.5 day                                                                           |
| **Total**                 | **~2 days** (vs. original 4.5 hour plan; the 4.5h was based on wrong assumptions) |
