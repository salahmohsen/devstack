# Self-Hosted Migration — Status & Real Gaps

**Status:** Stopped. Re-planning required.

## What Was Done

- ✅ Validated plan against official docs (Hono, Socket.IO, ioredis, Mastra, S3 SDK, TanStack Start)
- ✅ Rewrote `plan.md` for Hono-on-Node.js (replaced NestJS plan)
- ✅ Updated `README.md` and `PITFALLS.md`
- ✅ Task 1 complete: `docker-compose.infra.yml` + `scripts/init-databases.sh` (postgres, redis, minio)
- ✅ Commits: `0df7a9b` (plan rewrite) and `e3edc2a` (infra)

## Why We Stopped At Task 2

The plan was built on a **wrong mental model** of the project state. The actual
codebase has fundamental Cloudflare coupling at the build level that the plan
did not anticipate.

### Real Gaps Between Plan And Reality

| Plan Assumed                                                               | Actual State                                                                                                                                                                                                          |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Server is a plain Hono app that can run on Node.js via `@hono/node-server` | `apps/server/vite.config.ts` is **426 lines** of Cloudflare-specific shims, stubs, and polyfills. The current build target is **edge-only** — `vp build` produces `dist/portfolio_server/index.js` (CF Worker bundle) |
| Existing Dockerfiles are wrong (uses CF-era patterns)                      | Existing `apps/server/Dockerfile` and `apps/web/Dockerfile` already use Vite Plus with `node:25-bookworm-slim`. Server's CMD `node /app/.output/index.mjs` is **broken** — that file doesn't exist after build        |
| `app.ts` uses standard Hono middleware                                     | `app.ts` is **297 lines** that use `c.env.GITHUB_CACHE_KV`, `c.env.MEDIA_BUCKET`, `c.env.GITHUB_SIGNAL_RELAY`, `c.env.AGENT_WORKER` (all CF bindings), and `c.executionCtx.waitUntil()` (CF-specific)                 |
| Plan to use `tsx` for dev, `tsc` for build                                 | Project uses `vp` (Vite Plus) exclusively. No `tsc` build is wired up for the server                                                                                                                                  |
| `wrangler.jsonc` and CF Worker entry need removal                          | Removal alone is insufficient — the **build pipeline** produces CF-targeted output via `@cloudflare/vite-plugin` in `vite.config.ts`                                                                                  |

### Files That Are Much More Complex Than Planned

| File                                                            | Lines | Issue                                                                                                            |
| --------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------- |
| `apps/server/vite.config.ts`                                    | 426   | Hardcoded for Cloudflare edge target. Needs complete rewrite to build for Node.js                                |
| `apps/server/src/app.ts`                                        | 297   | Uses `c.env` for 4+ CF bindings. Needs refactoring to inject Node.js adapters                                    |
| `packages/api/src/lib/context/hono/create-context.ts`           | 102   | Reads CF bindings from `context.env`. Needs to accept Node.js modules (Redis client, S3 client)                  |
| `packages/api/src/lib/storage/index.ts`                         | 13    | Uses `files-sdk/r2` adapter. Needs swap to `files-sdk/s3` (this part is small)                                   |
| `apps/agent/src/mastra/index.ts`                                | 117   | Uses `CloudflareDeployer` and `MastraCompositeStore` with LibSQLStore. Needs PostgresStore + removal of deployer |
| `apps/web/src/server/files-gateway.ts`                          | 21    | Uses `import { env } from "cloudflare:workers"` and `files-sdk/r2`. Needs `files-sdk/s3`                         |
| `packages/api/src/lib/agent/worker.ts`                          | 37    | Uses CF `Fetcher` type. Minor — already has URL fallback                                                         |
| `apps/server/wrangler.jsonc` + `apps/server/wrangler.dev.jsonc` | 73+75 | Need deletion, plus `worker-configuration.d.ts` (CF types)                                                       |

## The Real Migration Surface

This is a **build-system migration** first, then code migration. The order should be:

### Phase 1: Make the Build Work for Node.js (BLOCKING)

1. Rewrite `apps/server/vite.config.ts` to remove `@cloudflare/vite-plugin` and all 400+ lines of CF shims
2. Configure a Node.js-compatible build target (TanStack Start with Nitro `node-server` preset, OR a standalone Hono bundle with `@hono/node-server`)
3. Update `apps/server/package.json` scripts: `dev` → no wrangler, `build` → Node.js target, `start` → Node entry
4. Get `pnpm run dev` working with the Hono app on Node.js

### Phase 2: Replace CF Bindings

1. KV → Redis adapter (ioredis)
2. R2 → MinIO/S3 (via `files-sdk/s3`)
3. Durable Object → Socket.IO + Redis adapter
4. Service binding (AGENT_WORKER) → HTTP fetch to `AGENT_WORKER_URL`
5. `executionCtx.waitUntil` → just await the promise (Node.js doesn't need this)

### Phase 3: Migrate the Web App

1. Remove `cloudflare:workers` import in `files-gateway.ts`
2. Update `files-gateway.ts` to use `files-sdk/s3` instead of `files-sdk/r2`
3. Remove CF Vite plugin from `apps/web/vite.config.ts` (if present)
4. The web's `vp build` already produces a Node.js-compatible output (it uses TanStack Start / Nitro)

### Phase 4: Migrate the Agent

1. Remove `CloudflareDeployer`
2. Use `PostgresStore` instead of `LibSQLStore`/`DuckDBStore`
3. Update `apps/agent/package.json` (remove wrangler, CF deps)
4. Update Dockerfile to use Node.js (not CF)

### Phase 5: Dockerfiles + Deployment

1. Update `apps/server/Dockerfile` port 5000 → 5100
2. Add `apps/agent/Dockerfile` (new)
3. Update `docker-compose.yaml` (Dokploy version — not Coolify) with Traefik labels
4. Configure Redis, MinIO, agent services
5. Update env vars

## What The Plan Missed

The plan was written assuming a clean Hono-on-Node.js migration with the only
changes being:

- Entry point (`worker.ts` → `node.ts`)
- Bindings (KV → Redis, R2 → MinIO, DO → Socket.IO)
- Dependencies (wrangler → Node.js libs)

The plan did NOT account for:

- **The build system is CF-coupled** (Vite plugin generates edge-only bundles)
- **`app.ts` uses CF-specific Hono patterns** (`c.env` is CF Workers API)
- **The web app uses `cloudflare:workers` import** (Node.js won't have this)
- **`@cloudflare/vite-plugin` produces an edge bundle, not a Node.js bundle** (need to change build target entirely)
- **The server's package.json has no Node.js build script** (just `wrangler dev` and `wrangler deploy`)

## Realistic Time Estimate

- Phase 1 (build migration): **2-3 days** (high risk — may need TanStack Start migration)
- Phase 2 (binding replacement): **1 day** (mostly mechanical)
- Phase 3 (web migration): **0.5 day** (small file changes)
- Phase 4 (agent migration): **0.5 day** (Mastra docs-driven)
- Phase 5 (Docker/deployment): **0.5 day**

**Total: 5-6 days of focused work**, not 4.5 hours.

## Next Step: Re-Plan

Before continuing, this plan should be **completely rewritten** to reflect:

1. The actual code structure (`vite.config.ts`, `app.ts`, `create-context.ts`)
2. The build-system-first approach (Phase 1 must come first)
3. The realistic time estimates
4. The use of Vite Plus (not `tsc`/`tsx`) for builds
5. The fact that `apps/web` already builds for Node.js via TanStack Start

The 14-task plan should be replaced with a 5-phase plan. The Docker Compose
infra (Task 1) and the plan validation (done in context7) are the only work
that survives the rewrite.
