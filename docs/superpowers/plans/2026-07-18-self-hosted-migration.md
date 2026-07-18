# Self-Hosted Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `personal-hub` from Cloudflare Workers to self-hosted Docker on Dokploy. Three Node.js apps (web, server, agent) behind Traefik, backed by Postgres, Redis, MinIO.

**Architecture:** Per the approved spec at `docs/superpowers/specs/2026-07-18-self-hosted-migration-design.md`. Build: web uses TanStack Start (Nitro `.output/`), server uses `vp pack` (Node.js bundle to `dist/index.mjs`), agent uses `mastra build` (`.mastra/output/`). Run: `node .mjs` for all three. CF bindings replaced: KV→Redis, R2→MinIO via `files-sdk/s3`, Durable Object→Socket.IO+Redis adapter, service binding→HTTP fetch, `waitUntil`→fire-and-forget.

**Tech Stack:** Hono, `@hono/node-server`, oRPC, Vite Plus (`vp pack`), Mastra, Socket.IO, ioredis, TanStack Start (Nitro), PostgreSQL, Redis, MinIO, Docker, Traefik, Dokploy

---

## File Structure

**Created:**

```
apps/server/src/node.ts                   # @hono/node-server entry
apps/server/src/runtime-context.ts         # NodeRuntime factory
apps/server/src/github-gateway.ts          # Socket.IO + Redis adapter
apps/server/vite.config.ts (new)           # vp pack config block
apps/agent/Dockerfile                      # Mastra Node.js build
docker-compose.yaml                        # Dokploy full stack
docker-compose.prod.yml                    # Dokploy production override
scripts/migrate-from-neon.sh               # temporary, deleted in cleanup
```

**Deleted:**

```
apps/server/vite.config.ts (426-line CF version)
apps/server/src/worker.ts
apps/server/src/github-signal-relay.ts
apps/server/wrangler.jsonc
apps/server/wrangler.dev.jsonc
apps/server/worker-configuration.d.ts
apps/web/wrangler.jsonc
apps/agent/wrangler.jsonc
docker-compose.coolify.yaml
scripts/migrate-from-neon.sh               # after cleanup
```

**Modified:**

```
apps/server/src/app.ts                                  # drop c.env.* reads, add /health routes
apps/server/package.json                                # scripts + deps
apps/server/Dockerfile                                  # port 5000→5100, build via vp pack
apps/agent/src/mastra/index.ts                          # PostgresStore
apps/agent/package.json                                 # drop CF deps
apps/web/src/server/files-gateway.ts                    # drop cloudflare:workers
apps/web/package.json                                   # drop CF devDeps
apps/web/Dockerfile                                     # drop CF build args
packages/api/src/lib/context/hono/create-context.ts     # accept NodeRuntime
packages/api/src/lib/agent/worker.ts                    # drop Fetcher, HTTP-only
packages/api/src/lib/storage/index.ts                   # files-sdk/s3
packages/github/src/runtime/bindings.ts                 # drop all CF types
packages/github/src/webhooks/handle-github-webhook.ts  # broadcast callback
packages/core/src/orpc-context/index.ts                 # OrpcContextGithubBinding change
packages/env/src/server/env.ts                          # new env vars
packages/env/.env                                       # dev values
```

---

## Task 1: Server build pipeline → Node.js (BLOCKING)

> Per spec Phase 1. Without a working Node.js build, nothing else is testable.
> **Markers:**
> `@blocker-if`: nothing — Task 1 is the foundation.
> `@done-when`: `vp pack` produces `dist/index.mjs`, server boots on `:5100`, `/health/live` returns 200.
> `@verify`: `curl http://localhost:5100/health/live` returns `{"status":"healthy",...}`.

**Files:**

- Delete: `apps/server/vite.config.ts` (426-line CF version), `apps/server/wrangler.jsonc`, `apps/server/wrangler.dev.jsonc`, `apps/server/src/worker.ts`, `apps/server/worker-configuration.d.ts`
- Create: `apps/server/vite.config.ts` (new, ~30 lines), `apps/server/src/node.ts` (~30 lines)
- Modify: `apps/server/src/app.ts` (add `/health/live` and `/health/ready` routes), `apps/server/package.json` (scripts + deps)

### Step 1: Delete CF-specific files

```bash
git rm apps/server/wrangler.jsonc apps/server/wrangler.dev.jsonc \
       apps/server/src/worker.ts apps/server/worker-configuration.d.ts
# Delete the CF shim vite config — we will rewrite it in the next step
git rm apps/server/vite.config.ts
```

- [ ] Done

### Step 2: Create new `apps/server/vite.config.ts`

Minimal Vite Plus config — only the `pack` block. No CF shims, no plugins to strip.

```typescript
import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: ["src/node.ts"],
    format: ["esm"],
    outDir: "dist",
    sourcemap: true
  }
});
```

- [ ] Done

### Step 3: Create `apps/server/src/node.ts`

Node.js entry — `serve()` from `@hono/node-server`. This replaces the deleted `worker.ts`.

```typescript
import { serve } from "@hono/node-server";
import type { Server as HTTPServer } from "node:http";

import { app } from "#@/app";
import { ENV_SERVER } from "@tsu-stack/env/server/env";

const port = Number(ENV_SERVER.PORT ?? 5100);

const httpServer = serve({ fetch: app.fetch, port }, (info) => {
  // eslint-disable-next-line no-console
  console.log(`Server running on http://localhost:${info.port}`);
}) as unknown as HTTPServer;

export { httpServer };
```

Note: `httpServer` is exported so Task 3 can attach Socket.IO to it.

- [ ] Done

### Step 4: Add health routes to `apps/server/src/app.ts`

Insert **before** the existing `app.get("/")` route (line 74):

```typescript
app.get("/health/live", (c) => c.json({ status: "healthy", timestamp: new Date().toISOString() }));

app.get("/health/ready", async (c) => {
  const checks: Record<string, { status: string; latencyMs: number }> = {};

  const dbStart = performance.now();
  try {
    const { checkIsDbReady } = await import("@tsu-stack/db");
    const isReady = await checkIsDbReady();
    checks.database = {
      status: isReady ? "healthy" : "unhealthy",
      latencyMs: Math.round(performance.now() - dbStart)
    };
  } catch {
    checks.database = {
      status: "unhealthy",
      latencyMs: Math.round(performance.now() - dbStart)
    };
  }

  const allHealthy = Object.values(checks).every((v) => v.status === "healthy");
  return c.json(
    {
      status: allHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      checks
    },
    allHealthy ? 200 : 503
  );
});
```

The `/health/ready` Redis check is added in Task 2 (after the Redis client exists). For now this proves the route and DB check work.

- [ ] Done

### Step 5: Install new server deps

```bash
vpx vp add @hono/node-server socket.io @socket.io/redis-adapter ioredis --filter @tsu-stack/server
```

If `vpx vp add` is unavailable, edit `apps/server/package.json` directly:

```json
"dependencies": {
  "@hono/node-server": "^1.19.14",
  "@socket.io/redis-adapter": "^8.3.0",
  "ioredis": "^5.4.2",
  "socket.io": "^4.7.5",
  // ... existing deps unchanged
}
```

Then `vp install`.

- [ ] Done

### Step 6: Update `apps/server/package.json` scripts

Replace the scripts block:

```json
"scripts": {
  "dev": "pnpm dotenvx run -f ../../packages/env/.env -- tsx watch src/node.ts",
  "build": "vp pack",
  "start": "node dist/index.mjs"
}
```

Drop `cf-typegen`, `deploy`, `logs` scripts. Drop from `devDependencies`: `@cloudflare/vite-plugin`, `wrangler`, `cross-env`. Add to `devDependencies`: `tsx` (if not already in catalog).

If `vp dev` SSR mode works later, switch `dev` to `vp dev` — for now `tsx watch` is a known-safe fallback per Hono Node.js docs.

- [ ] Done

### Step 7: Add `PORT` env var

Add to `packages/env/src/server/env.ts`:

```typescript
PORT: z.coerce.number().default(5100),
```

Add to `packages/env/.env`:

```
PORT=5100
```

- [ ] Done

### Step 8: Install dev deps + verify build

```bash
vp install
cd apps/server && pnpm dotenvx run -f ../../packages/env/.env -- vp pack
ls dist/index.mjs  # Expected: file exists
```

Expected output: `dist/index.mjs` exists, ~300KB-1MB.

- [ ] Done

### Step 9: Boot the server and verify health endpoints

```bash
pnpm dotenvx run -f ../../packages/env/.env -- node dist/index.mjs
# Expected log: "Server running on http://localhost:5100"

# In another terminal:
curl http://localhost:5100/health/live
# Expected: {"status":"healthy","timestamp":"..."}

curl http://localhost:5100/health/ready
# Expected: {"status":"unhealthy","timestamp":"...","checks":{"database":{"status":"unhealthy",...}}}
# (database unreachable because DATABASE_URL still points at Neon — expected in Task 1)
```

The `/health/ready` returning `unhealthy` for the DB is fine at this point — the goal is just that the route exists and the server boots. The full DB/Redis checks are verified in Task 2.

- [ ] Done

### Step 10: Validate and commit

Per `AGENTS.md`, run package-local validation after a scoped change:

```bash
vp check --filter @tsu-stack/server
# Expected: typecheck + lint pass

git add apps/server/ packages/env/
git commit -m "feat: migrate server build from Cloudflare to Node.js (vp pack)"
```

- [ ] Done

---

## Task 2: Replace CF bindings in createContext

> Per spec Phase 2. The biggest refactor — replace 5 CF bindings with Node.js modules passed in as a `NodeRuntime`.
> **Markers:**
> `@blocker-if`: Task 1 committed, `docker-compose.infra.yml` running (`docker compose -f docker-compose.infra.yml up -d`).
> `@done-when`: All infrastructure containers reachable, `/health/ready` shows database + redis healthy.
> `@verify`: `curl http://localhost:5100/health/ready` returns all checks healthy.

**Files:**

- Modify: `packages/api/src/lib/context/hono/create-context.ts`, `packages/api/src/lib/agent/worker.ts`, `packages/api/src/lib/storage/index.ts`, `packages/github/src/runtime/bindings.ts`, `packages/github/src/webhooks/handle-github-webhook.ts`, `apps/web/src/server/files-gateway.ts`, `apps/server/src/app.ts:134-178` (webhook handler), `packages/core/src/orpc-context/index.ts` (binding type)
- Create: `apps/server/src/runtime-context.ts`, `packages/github/src/infrastructure/cache/redis-cache-adapter.ts`

### Step 1: Start dev infrastructure

```bash
docker compose -f docker-compose.infra.yml up -d
docker compose -f docker-compose.infra.yml ps
# Expected: postgres (healthy), redis (healthy), minio (started)
docker compose -f docker-compose.infra.yml exec postgres psql -U admin -l
# Expected: personal_hub and mastra_agent databases listed
```

- [ ] Done

### Step 2: Create `apps/server/src/runtime-context.ts`

The `NodeRuntime` factory — builds Redis client, Files instance, and (later) the Socket.IO broadcast function once Task 3 attaches it. For now `broadcastSignals` is a no-op.

```typescript
import Redis from "ioredis";

import { createFiles } from "@tsu-stack/api/lib/storage/index";
import { ENV_SERVER } from "@tsu-stack/env/server/env";

export type NodeRuntime = {
  redis: Redis;
  files: ReturnType<typeof createFiles>;
  broadcastSignals: (keys: string[]) => void;
  agentWorkerUrl: string | undefined;
};

let _runtime: NodeRuntime | null = null;

export function initRuntime(): NodeRuntime {
  if (_runtime) return _runtime;

  const redis = new Redis(ENV_SERVER.REDIS_URL ?? "redis://localhost:6379");
  const files = createFiles();

  _runtime = {
    redis,
    files,
    // Will be replaced by Task 3 once the gateway is wired up
    broadcastSignals: () => {},
    agentWorkerUrl: ENV_SERVER.AGENT_WORKER_URL
  };
  return _runtime;
}

export function getRuntime(): NodeRuntime {
  if (!_runtime) throw new Error("Runtime not initialized");
  return _runtime;
}

export function setBroadcastSignals(fn: (keys: string[]) => void) {
  if (_runtime) _runtime.broadcastSignals = fn;
}
```

- [ ] Done

### Step 3: Create `packages/github/src/infrastructure/cache/redis-cache-adapter.ts`

Implements `GitHubCacheKv` so `packages/github/infrastructure/cache/github-cache.ts` doesn't need to change.

```typescript
import type { GitHubCacheKv } from "#@/runtime/bindings";

type RedisClient = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { EX?: number }): Promise<string | null>;
  del(...keys: string[]): Promise<number>;
};

export function createRedisCacheAdapter(redis: RedisClient): GitHubCacheKv {
  return {
    async get<T>(key: string, type: "json"): Promise<T | null> {
      const raw = await redis.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    },

    async get(key: string, type?: "text"): Promise<string | null> {
      return redis.get(key);
    },

    async put(
      key: string,
      value: string,
      options?: { expirationTtl?: number; metadata?: unknown }
    ): Promise<void> {
      if (options?.expirationTtl) {
        await redis.set(key, value, { EX: options.expirationTtl });
      } else {
        await redis.set(key, value);
      }
    },

    async delete(key: string): Promise<void> {
      await redis.del(key);
    }
  };
}
```

- [ ] Done

### Step 4: Modify `packages/github/src/runtime/bindings.ts`

**Fully drop all CF types.** Replace `signalRelay` with `broadcast` callback. Remove `executionContext` since `waitUntil` is no longer needed in Node.js.

Original file is 32 lines. After this change:

```typescript
export type GitHubCacheKv = {
  delete(key: string): Promise<void>;
  get<T>(key: string, type: "json"): Promise<T | null>;
  get(key: string, type?: "text"): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: {
      expirationTtl?: number;
      metadata?: unknown;
    }
  ): Promise<void>;
};

export type GitHubRuntimeBindings = {
  kv?: GitHubCacheKv;
  broadcast?: (signalKeys: string[]) => void;
};
```

Specifically delete:

- The `ExecutionContextLike` type (lines 1-3 originally)
- The `DurableObjectStubLike` type (lines 19-21 originally)
- The `DurableObjectNamespaceLike` type (lines 23-26 originally)
- The `executionContext` field on `GitHubRuntimeBindings`
- The `signalRelay` field on `GitHubRuntimeBindings`

Also export the Redis adapter factory:

```typescript
export { createRedisCacheAdapter } from "#@/infrastructure/cache/redis-cache-adapter";
```

- [ ] Done

### Step 5: Modify `packages/core/src/orpc-context/index.ts`

Update `OrpcContextGithubBinding` type to mirror the new `bindings.ts`:

```diff
 export type OrpcContextGithubBinding = {
-  executionContext?: { waitUntil(promise: Promise<unknown>): void };
   kv?: {
     delete(key: string): Promise<void>;
     get<T>(key: string, type: "json"): Promise<T | null>;
     get(key: string, type?: "text"): Promise<string | null>;
     put(
       key: string,
       value: string,
       options?: { expirationTtl?: number; metadata?: unknown }
     ): Promise<void>;
   };
-  signalRelay?: {
-    get(id: unknown): { fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> };
-    idFromName(name: string): unknown;
-  };
+  broadcast?: (signalKeys: string[]) => void;
 };
```

`OrpcContextAgentWorker` unchanged (it already uses `RequestInfo`, not the CF `Fetcher` type).

- [ ] Done

### Step 6: Modify `packages/api/src/lib/storage/index.ts`

Swap `files-sdk/r2` for `files-sdk/s3`. Read config from env.

**Important**: `storage/index.ts` lives in `packages/api` which is imported by **both** `apps/web` (via `apps/web/src/server/files-gateway.ts`) AND `apps/server`. The original file already uses `ENV_WEB_SERVER` from `@tsu-stack/env/web/env.server` (NOT `ENV_SERVER` from `@tsu-stack/env/server/env`) — preserve that choice so the web app can import it. Add the new S3 vars to `packages/env/src/web/env.server.ts` in Step 7 (in addition to `server/env.ts`).

Original file is 13 lines. Replace with:

```typescript
import { Files } from "files-sdk";
import { s3 } from "files-sdk/s3";

import { ENV_WEB_SERVER } from "@tsu-stack/env/web/env.server";

export function createFiles() {
  return new Files({
    adapter: s3({
      bucket: ENV_WEB_SERVER.S3_BUCKET || "personal-hub",
      region: ENV_WEB_SERVER.S3_REGION || "us-east-1",
      endpoint: ENV_WEB_SERVER.S3_ENDPOINT,
      forcePathStyle: ENV_WEB_SERVER.S3_FORCE_PATH_STYLE ?? true,
      credentials: {
        accessKeyId: ENV_WEB_SERVER.S3_ACCESS_KEY || "",
        secretAccessKey: ENV_WEB_SERVER.S3_SECRET_KEY || ""
      },
      publicBaseUrl: ENV_WEB_SERVER.MEDIA_PUBLIC_URL
    })
  });
}
```

- [ ] Done

### Step 7: Add S3 env vars to env schemas

Add to **both** `packages/env/src/server/env.ts` AND `packages/env/src/web/env.server.ts` (the web env is shared with the web app's server-side code — `storage/index.ts` reads `ENV_WEB_SERVER` per Step 6):

**For `packages/env/src/server/env.ts`** (server-side vars — Redis, AGENT_WORKER_URL, etc.):

```typescript
S3_ENDPOINT: z.string().optional(),
S3_ACCESS_KEY: z.string().optional(),
S3_SECRET_KEY: z.string().optional(),
S3_BUCKET: z.string().default("personal-hub"),
S3_REGION: z.string().default("us-east-1"),
S3_FORCE_PATH_STYLE: z.stringbool().default(true),
MEDIA_PUBLIC_URL: z.string().optional(),
REDIS_URL: z.string().optional(),
AGENT_WORKER_URL: z.string().optional(),
OTEL_SERVICE_NAME: z.string().default("personal-hub-server"),
```

**For `packages/env/src/web/env.server.ts`** (read by `storage/index.ts`) — keep existing vars, add the S3 set (drop `REDIS_URL` and `AGENT_WORKER_URL` — those are server-only):

```typescript
S3_ENDPOINT: z.string().optional(),
S3_ACCESS_KEY: z.string().optional(),
S3_SECRET_KEY: z.string().optional(),
S3_BUCKET: z.string().default("personal-hub"),
S3_REGION: z.string().default("us-east-1"),
S3_FORCE_PATH_STYLE: z.stringbool().default(true),
MEDIA_PUBLIC_URL: z.string().optional(),
```

(Keep the existing `R2_PUBLIC_BASE_URL` in web env.server for backward compat during transition — drop it in Task 5 final cleanup if unused.)

Update `packages/env/.env` with dev values (several already present from `ada51fe`):

```
REDIS_URL="redis://:changeme@localhost:6379"
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_BUCKET="personal-hub"
S3_REGION="us-east-1"
S3_FORCE_PATH_STYLE="true"
MEDIA_PUBLIC_URL="http://localhost:9000/personal-hub"
```

NOTE: The local Postgres has password `changeme` (per `docker-compose.infra.yml`) — set `DATABASE_URL` to point at local Postgres for Task 2 verification:

```
DATABASE_URL="postgresql://admin:changeme@localhost:5432/personal_hub"
```

Save current Neon `DATABASE_URL` in `DATABASE_URL_NEON_BACKUP` for the data migration script (Task 5).

- [ ] Done

### Step 8: Modify `packages/api/src/lib/agent/worker.ts`

Drop the `Fetcher` type. Always HTTP fetch. Keep the `duplex: "half"` for streaming bodies per the existing `@ts-expect-error` comment.

Original file is 37 lines. Replace with:

```typescript
import type { OrpcContextAgentWorker } from "#@/lib/context/types";

export type AgentWorkerEnv = {
  AGENT_WORKER_URL?: string;
};

export function createAgentWorker(env: AgentWorkerEnv): OrpcContextAgentWorker {
  return {
    fetch(input, init) {
      const baseUrl = env.AGENT_WORKER_URL;
      if (!baseUrl) {
        throw new Error("Agent worker is not configured. Set AGENT_WORKER_URL.");
      }
      const inputUrl = input instanceof Request ? input.url : String(input);
      const resolved = new URL(inputUrl, baseUrl).href;

      const request = new Request(resolved, init);
      return fetch(resolved, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        // @ts-expect-error - duplex is non-standard but supported in Node 18+
        duplex: "half"
      });
    }
  };
}
```

- [ ] Done

### Step 9: Modify `packages/github/src/webhooks/handle-github-webhook.ts`

Replace the DO broadcast block (lines ~74-82 originally):

```typescript
// OLD:
if (input.runtime?.signalRelay) {
  const id = input.runtime.signalRelay.idFromName("global");
  const stub = input.runtime.signalRelay.get(id);
  const task = stub.fetch("https://internal/broadcast", {
    body: JSON.stringify({ signalKeys }),
    method: "POST"
  });
  input.runtime.executionContext?.waitUntil(task);
}

// NEW:
if (input.runtime?.broadcast) {
  input.runtime.broadcast(signalKeys);
}
```

The new call is synchronous — Socket.IO `emit` is fire-and-forget. No `waitUntil` needed since Node.js event loop outlives the request.

- [ ] Done

### Step 10: Modify `packages/api/src/lib/context/hono/create-context.ts`

Change the `createContext()` signature to accept a `NodeRuntime` parameter rather than reading from Hono env. Significantly:

```typescript
// Add import:
import { createRedisCacheAdapter } from "@tsu-stack/github/infrastructure/cache/redis-cache-adapter";
import type { NodeRuntime } from "#@/runtime-context"; // apps/server's runtime-context

// Change signature:
export async function createContext<TEnv>({
  context,
  logger,
  runtime // NEW parameter
}: {
  context: HonoContext<TEnv>;
  logger: RequestLogger;
  runtime: NodeRuntime;
}): Promise<OrpcContext> {
  // ... session/octokit setup unchanged

  // Replace these lines in the return object:
  return {
    github: {
      binding: {
        // OLD: executionContext, kv from c.env, signalRelay from c.env
        kv: createRedisCacheAdapter(runtime.redis),
        broadcast: runtime.broadcastSignals
      },
      privateOctokit: createGitHubOctokit(privateSource),
      publicOctokit: createGitHubOctokit(githubSource.isConfigured ? githubSource : undefined),
      source: githubSource
    },
    logger,
    session,
    // OLD: mediaBucket from context.env.MEDIA_BUCKET
    mediaBucket: runtime.files,
    // OLD: agentWorker from context.env.AGENT_WORKER
    agentWorker: createAgentWorker({ AGENT_WORKER_URL: runtime.agentWorkerUrl })
  };
}
```

The `HonoBindings` type in this file no longer needs `GITHUB_CACHE_KV`, `GITHUB_SIGNAL_RELAY`, `MEDIA_BUCKET`, or `AGENT_WORKER` — they all come via `runtime`.

- [ ] Done

### Step 11: Modify `apps/server/src/app.ts` to wire `createContext` with the runtime

In the `/*` middleware block (lines ~256-297 originally), pass the runtime:

```typescript
// OLD:
const context = await createContext({ context: c, logger: c.get("log") });

// NEW:
import { getRuntime } from "#@/runtime-context";
const context = await createContext({
  context: c,
  logger: c.get("log"),
  runtime: getRuntime()
});
```

Also update the `/webhooks/github` POST handler (lines 134-178):

- Drop the `executionContext: c.executionCtx` line from the `runtime` object (line 168)
- Drop `kv: c.env.GITHUB_CACHE_KV` and `signalRelay: c.env.GITHUB_SIGNAL_RELAY` (lines 169-170)
- Replace with:

  ```typescript
  runtime: {
    broadcast: getRuntime().broadcastSignals,
    kv: createRedisCacheAdapter(getRuntime().redis)
  }
  ```

Also add Redis check to `/health/ready` (replace the placeholder from Task 1 Step 4):

```typescript
const redisStart = performance.now();
try {
  const redis = getRuntime().redis;
  const pong = await redis.ping();
  checks.redis = {
    status: pong === "PONG" ? "healthy" : "unhealthy",
    latencyMs: Math.round(performance.now() - redisStart)
  };
} catch {
  checks.redis = {
    status: "unhealthy",
    latencyMs: Math.round(performance.now() - redisStart)
  };
}
```

Also initialize the runtime at server boot — call `initRuntime()` once at module load in `apps/server/src/node.ts`:

```typescript
import { initRuntime } from "#@/runtime-context";
// ... at the top of node.ts, BEFORE the serve() call:
initRuntime();
```

- [ ] Done

### Step 12: Modify `apps/web/src/server/files-gateway.ts`

Drop `cloudflare:workers` import. Call `createFiles()` with no args.

Original 21 lines. New content:

```typescript
import { FilesError } from "files-sdk";
import { createFilesRouter } from "files-sdk/api";

import { createFiles } from "@tsu-stack/api/lib/storage/index";
import { auth } from "@tsu-stack/auth";
import { ENV_WEB_ISOMORPHIC } from "@tsu-stack/env/web/env.isomorphic";
import { ENV_WEB_SERVER } from "@tsu-stack/env/web/env.server";

export const filesRouter = createFilesRouter({
  files: createFiles(), // no env.MEDIA_BUCKET arg anymore
  secret: ENV_WEB_SERVER.FILES_API_SECRET,
  allowedOrigins: [ENV_WEB_ISOMORPHIC.VITE_WEB_URL],
  authorize: async ({ req }) => {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      throw new FilesError("Unauthorized", "sign in");
    }
    return { keyPrefix: `${session.user.id}/` };
  }
});
```

- [ ] Done

### Step 13: Verify build still passes

```bash
vp run -w fix  # workspace-wide lint/format/typecheck
cd apps/server && pnpm dotenvx run -f ../../packages/env/.env -- vp pack
ls dist/index.mjs
# Expected: file exists
```

- [ ] Done

### Step 14: Smoke test

```bash
DATABASE_URL="postgresql://admin:changeme@localhost:5432/personal_hub" \
REDIS_URL="redis://:changeme@localhost:6379" \
S3_ENDPOINT="http://localhost:9000" \
S3_ACCESS_KEY="minioadmin" \
S3_SECRET_KEY="minioadmin" \
pnpm dotenvx run -f ../../packages/env/.env -- node dist/index.mjs &

curl http://localhost:5100/health/ready
# Expected: {"status":"healthy","checks":{"database":{"status":"healthy",...},"redis":{"status":"healthy",...}}}

curl http://localhost:5100/
# Expected: {"name":"tsu-stack-server","status":"ok",...}
```

If DB check unhealthy, run Drizzle migrations against local Postgres:

```bash
DATABASE_URL="postgresql://admin:changeme@localhost:5432/personal_hub" vp run db:migrate
```

- [ ] Done

### Step 15: Commit

```bash
git add apps/server/ apps/web/ packages/api/ packages/github/ packages/core/ packages/env/
git commit -m "feat: replace CF bindings with Node.js runtime (Redis, MinIO, broadcast)"
```

- [ ] Done

---

## Task 3: Socket.IO gateway replaces Durable Object

> Per spec Phase 3. Replaces the CF Durable Object `GitHubSignalRelay` with Socket.IO + Redis adapter for cross-instance broadcast.
> **Markers:**
> `@blocker-if`: Task 2 committed, Redis running.
> `@done-when`: Browser connects via `socket.io-client` and receives a broadcast.
> `@verify`: Manual browser test — connect, subscribe to a key, trigger a broadcast, see the message.

**Files:**

- Create: `apps/server/src/github-gateway.ts`
- Modify: `apps/server/src/node.ts` (initialize gateway after serve)
- Delete: `apps/server/src/github-signal-relay.ts`

### Step 1: Create `apps/server/src/github-gateway.ts`

Socket.IO server with the Redis adapter. Module-level `broadcastSignals` export so Task 2's `setBroadcastSignals` can wire it up. Per official Socket.IO docs (the "With Hono (Node.js)" pattern).

```typescript
import { Server as SocketIOServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import type { Server as HTTPServer } from "node:http";
import Redis from "ioredis";

type ClientSubscription = {
  keys: Set<string>;
};

let _broadcastSignals: ((keys: string[]) => void) | null = null;

export function createGithubGateway(httpServer: HTTPServer, redisUrl: string) {
  const pubClient = new Redis(redisUrl);
  const subClient = pubClient.duplicate();

  const io = new SocketIOServer(httpServer, {
    path: "/api/ws/github-signals",
    cors: {
      origin: "*",
      credentials: true
    }
  });

  io.adapter(createAdapter(pubClient, subClient));

  const clientSubscriptions = new Map<string, ClientSubscription>();

  io.on("connection", (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);

    socket.on("subscribe", (payload: { keys: string[] }) => {
      if (payload?.keys && Array.isArray(payload.keys)) {
        clientSubscriptions.set(socket.id, { keys: new Set(payload.keys) });
        for (const key of payload.keys) {
          socket.join(`signal:${key}`);
        }
      }
    });

    socket.on("disconnect", () => {
      clientSubscriptions.delete(socket.id);
      console.log(`[WS] Client disconnected: ${socket.id}`);
    });
  });

  function broadcastSignals(signalKeys: string[]) {
    for (const key of signalKeys) {
      io.to(`signal:${key}`).emit("github-signals", { type: "signals", keys: signalKeys });
    }
  }

  function broadcastWebhook(event: string, payload: unknown) {
    io.emit("github-webhook", { event, payload });
  }

  _broadcastSignals = broadcastSignals;
  return { io, broadcastSignals, broadcastWebhook };
}

export function broadcastSignals(signalKeys: string[]) {
  _broadcastSignals?.(signalKeys);
}
```

- [ ] Done

### Step 2: Wire up the gateway in `apps/server/src/node.ts`

After `initRuntime()` and after `serve()`, import the gateway's module-level `broadcastSignals` export and pass it to `setBroadcastSignals`:

```typescript
import { createGithubGateway, broadcastSignals } from "#@/github-gateway";
import { setBroadcastSignals } from "#@/runtime-context";
import { ENV_SERVER } from "@tsu-stack/env/server/env";

// ... existing serve() call produces httpServer in scope ...

if (ENV_SERVER.REDIS_URL) {
  createGithubGateway(httpServer, ENV_SERVER.REDIS_URL);
  setBroadcastSignals(broadcastSignals);
}
```

Note: the `broadcastSignals` import only resolves to the actual function after `createGithubGateway` runs (it sets the module-level `_broadcastSignals` closure). If a webhook fires before the gateway initializes, the no-op from `runtime-context.ts`'s initial `broadcastSignals: () => {}` kicks in. Once the gateway initializes, the exported `broadcastSignals` calls the real one.

- [ ] Done

### Step 3: Delete `apps/server/src/github-signal-relay.ts`

```bash
git rm apps/server/src/github-signal-relay.ts
```

- [ ] Done

### Step 4: Remove the DO route from `apps/server/src/app.ts`

Delete the block at lines 82-91 that handled `/api/ws/github-signals`:

```typescript
// DELETE THIS BLOCK:
app.get("/api/ws/github-signals", async (c) => {
  const relay = c.env.GITHUB_SIGNAL_RELAY;
  if (!relay) {
    return c.json({ message: "GitHub signal relay is not configured." }, 503);
  }
  const id = relay.idFromName("global");
  const stub = relay.get(id);
  return stub.fetch("https://internal/connect", c.req.raw);
});
```

Socket.IO handles its own path (`/api/ws/github-signals`) — no Hono route needed.

- [ ] Done

### Step 5: Verify build still passes

```bash
cd apps/server && pnpm dotenvx run -f ../../packages/env/.env -- vp pack
ls dist/index.mjs  # Expected: exists
```

- [ ] Done

### Step 6: Manual browser test

Install `socket.io-client` in the web app (if not already):

```bash
vpx vp add socket.io-client --filter @tsu-stack/web
```

Boot the server, open a browser console:

```javascript
import { io } from "socket.io-client";
const socket = io("http://localhost:5100", { path: "/api/ws/github-signals" });
socket.on("connect", () => console.log("connected", socket.id));
socket.emit("subscribe", { keys: ["test-key"] });
socket.on("github-signals", (msg) => console.log("received", msg));
```

Trigger a broadcast (e.g. simulate a webhook POST with the GitHub secret), then verify the browser console shows `received { type: "signals", keys: ["test-key"] }`.

Alternatively, run a two-process test for the Redis adapter cross-instance fan-out:

```bash
PORT=5100 node dist/index.mjs &
PORT=5101 node dist/index.mjs &
# Connect client to :5100, emit webhook to :5101, client on :5100 should receive signal
```

- [ ] Done

### Step 7: Commit

```bash
git add apps/server/
git commit -m "feat: replace CF Durable Object with Socket.IO + Redis adapter"
```

- [ ] Done

---

## Task 4: Agent migration

> Per spec Phase 4. Convert the Mastra agent from the CF deployer to a Node.js server with PostgresStore.
> **Markers:**
> `@blocker-if`: Task 2 committed, `mastra_agent` database exists locally (verified in Task 2 Step 1).
> `@done-when`: `pnpm build` (which runs `mastra build`) produces `.mastra/output/index.mjs`, agent boots on `:4111`, `/api/agents` returns 200.
> `@verify`: `curl http://localhost:4111/api/agents` returns JSON array.
>
> **REQUIRED SUB-SKILL:** Per `apps/agent/AGENTS.md`, load the `mastra` skill BEFORE any Mastra work. Never rely on cached knowledge — Mastra APIs change between versions. Use `pnpm build` / `pnpm dev` from `apps/agent/package.json` instead of running `mastra build` / `mastra dev` directly.

**Files:**

- Modify: `apps/agent/src/mastra/index.ts`, `apps/agent/package.json`
- Delete: `apps/agent/wrangler.jsonc`
- Create: `apps/agent/Dockerfile`

### Step 1: Update `apps/agent/src/mastra/index.ts`

Remove `CloudflareDeployer`, `DuckDBStore`, `LibSQLStore`. Use `PostgresStore` pointing at the `mastra_agent` database (NOT `personal_hub` — they share a Postgres instance but use different DBs).

Original is 117 lines. Remove lines referring to:

- `import { CloudflareDeployer } from "@mastra/deployer-cloudflare"`
- `import { DuckDBStore } from "@mastra/duckdb"`
- `import { LibSQLStore } from "@mastra/libsql"`
- The entire `deployer: new CloudflareDeployer(...)` block
- The `MastraCompositeStore` with `LibSQLStore`/`DuckDBStore` branches (lines 65-90)
- `import { ENV_SERVER } from "@tsu-stack/env/server/env"` if only used by removed code
- `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` references (gone with LibSQLStore)

Replace with:

```typescript
import { Mastra } from "@mastra/core/mastra";
import { PostgresStore } from "@mastra/pg";
import { PinoLogger } from "@mastra/loggers";

import { createStackCategorizerAgent } from "#@/mastra/agents/stack-categorizer-agent";
import { createWeatherAgent } from "#@/mastra/agents/weather-agent";
import {
  completenessScorer,
  toolCallAppropriatenessScorer,
  translationScorer
} from "#@/mastra/scorers/weather-scorer";
import { detectStacksWorkflow } from "#@/mastra/workflows/detect-stacks-workflow";
import { organizeStacksWorkflow } from "#@/mastra/workflows/organize-stacks-workflow";
import { weatherWorkflow } from "#@/mastra/workflows/weather-workflow";

export const mastra = new Mastra({
  server: {
    // Keep the existing chatRoute import + config from the original file
    apiRoutes: [
      /* keep existing chatRoute(...) call */
    ]
  },
  bundler: {
    // DROP the externals array entirely — it only listed "@mastra/duckdb" and
    // "@duckdb/node-bindings" which are no longer deps. If other externals
    // remain, keep them; otherwise remove the whole `bundler` block.
    externals: []
  },
  workflows: {
    weatherWorkflow,
    detectStacksWorkflow,
    organizeStacksWorkflow
  },
  agents: {
    weatherAgent: createWeatherAgent(),
    stackCategorizerAgent: createStackCategorizerAgent()
  },
  scorers: { toolCallAppropriatenessScorer, completenessScorer, translationScorer },
  storage: new PostgresStore({
    id: "mastra-agent-storage",
    connectionString: process.env.DATABASE_URL
  }),
  logger: new PinoLogger({
    name: "personal-hub-agent",
    level: "info"
  }),
  observability: {
    // Keep the existing top-level Observability config (configs.development
    // with MastraStorageExporter, configs.production with MastraPlatformExporter,
    // and configSelector). This top-level block does NOT reference DuckDBStore —
    // DuckDBStore was used in the `storage` block above, which we've now replaced
    // with PostgresStore.
  }
});
```

The `MastraCompositeStore` abstraction (used at lines 65-90 of the original) is no longer needed — `PostgresStore` is the only storage, so we hand it directly to `storage` rather than wrapping it in a composite with per-domain overrides.

- [ ] Done

### Step 2: Update `apps/agent/package.json`

Drop CF deps:

```diff
"devDependencies": {
-  "@dotenvx/dotenvx": "catalog:",
   "@tsu-stack/tsconfig": "workspace:*",
   "@types/node": "catalog:",
-  "cross-env": "catalog:",
-  "mastra": "catalog:",
-  "wrangler": "catalog:"
+  "mastra": "catalog:",
+  "@dotenvx/dotenvx": "catalog:"
},
"dependencies": {
-  "@duckdb/node-bindings": "catalog:",
   "@mastra/ai-sdk": "catalog:",
-  "@mastra/cloudflare-d1": "catalog:",
   "@mastra/core": "catalog:",
-  "@mastra/deployer-cloudflare": "catalog:",
-  "@mastra/duckdb": "catalog:",
   "@mastra/evals": "catalog:",
-  "@mastra/libsql": "catalog:",
   "@mastra/loggers": "catalog:",
   "@mastra/memory": "catalog:",
   "@mastra/observability": "catalog:",
   "@mastra/pg": "catalog:",
   // keep rest unchanged
}
```

Update scripts:

```json
"scripts": {
  "dev": "pnpm dotenvx run -f ../../packages/env/.env -- mastra dev",
  "build": "cross-env IS_BUILD=true mastra build",
  "start": "node .mastra/output/index.mjs"
}
```

- [ ] Done

### Step 3: Delete `apps/agent/wrangler.jsonc`

```bash
git rm apps/agent/wrangler.jsonc
```

- [ ] Done

### Step 4: Create `apps/agent/Dockerfile`

Follow the same pattern as the existing `apps/server/Dockerfile` (node:25-bookworm-slim + Vite Plus). Build via `mastra build`, CMD `node .mastra/output/index.mjs`.

```dockerfile
FROM node:25-bookworm-slim AS base

RUN apt-get update \
  && apt-get install -y --no-install-recommends wget git ca-certificates \
  && update-ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Vite Plus CLI
ARG VITE_PLUS_VERSION=0.1.23
RUN npm pack "@voidzero-dev/vite-plus-cli-linux-x64-gnu@${VITE_PLUS_VERSION}" \
        --pack-destination /tmp && \
    mkdir -p /root/.vite-plus/bin && \
    tar xzf /tmp/voidzero-dev-vite-plus-cli-linux-x64-gnu-*.tgz -C /root/.vite-plus/bin \
        --strip-components=1 package/vp && \
    chmod +x /root/.vite-plus/bin/vp
ENV PATH="/root/.vite-plus/bin:$PATH"

COPY --parents **/package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN vp install --frozen-lockfile --ignore-scripts

COPY . .

ARG SOURCE_COMMIT DATABASE_URL NODE_ENV
ENV SOURCE_COMMIT=${SOURCE_COMMIT} \
    DATABASE_URL=${DATABASE_URL} \
    NODE_ENV=${NODE_ENV}

RUN pnpm --filter @tsu-stack/agent build

FROM node:25-bookworm-slim AS runner
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends wget ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN addgroup --gid 1001 nodejs \
    && adduser --uid 1001 --ingroup nodejs --disabled-password --gecos "" agent
USER agent

COPY --from=builder --chown=agent:nodejs /app/apps/agent/.mastra/output /app/.mastra/output
COPY --from=builder --chown=agent:nodejs /app/apps/agent/node_modules /app/node_modules
COPY --from=builder --chown=agent:nodejs /app/apps/agent/package.json /app/package.json

EXPOSE 4111

HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4111/api/agents || exit 1

CMD ["node", "/app/.mastra/output/index.mjs", "--hostname", "0.0.0.0"]
```

- [ ] Done

### Step 5: Build and test

```bash
cd apps/agent && pnpm dotenvx run -f ../../packages/env/.env -- pnpm build
ls .mastra/output/index.mjs  # Expected: exists

# Point at mastra_agent database:
DATABASE_URL="postgresql://admin:changeme@localhost:5432/mastra_agent" \
node .mastra/output/index.mjs &

curl http://localhost:4111/api/agents
# Expected: JSON array of agents (weatherAgent, stackCategorizerAgent)

# Verify server can reach agent (requires server running from Task 2):
AGENT_WORKER_URL="http://localhost:4111" \
curl -X POST http://localhost:5100/rpc/agent.detectStacks \
  -H "Content-Type: application/json" \
  -d '{"repoUrl":"github.com/o/r"}'
# Expected: 200 with detection result
```

- [ ] Done

### Step 6: Validate and commit

Per `AGENTS.md`, run package-local validation after a scoped change:

```bash
vp check --filter @tsu-stack/agent
# Expected: typecheck + lint pass

git add apps/agent/
git commit -m "feat: migrate agent from Cloudflare deployer to PostgresStore"
```

- [ ] Done

---

## Task 5: Web migration + deployment

> Per spec Phase 5. Remove remaining CF plumbing from web, update Dockerfiles, and create the Dokploy deployment compose files.
> **Markers:**
> `@blocker-if`: Tasks 1-4 committed.
> `@done-when`: `docker compose -f docker-compose.prod.yml ps` shows all 6 services healthy, end-to-end smoke test passes, final cleanup grep returns 0 matches.
> `@verify`: `grep -r "wrangler\|DurableObject\|CloudflareDeployer\|cloudflare:workers" apps/ packages/ --include="*.ts" --include="*.json" --include="*.jsonc"` returns 0 matches.

**Files:**

- Delete: `apps/web/wrangler.jsonc`, `docker-compose.coolify.yaml`
- Modify: `apps/web/package.json`, `apps/web/Dockerfile`, `apps/server/Dockerfile`
- Create: `docker-compose.yaml`, `docker-compose.prod.yml`, `scripts/migrate-from-neon.sh`
- Modify: `packages/env/src/server/env.ts`, `packages/env/.env`, `.gitignore`

### Step 1: Delete `apps/web/wrangler.jsonc`

```bash
git rm apps/web/wrangler.jsonc
```

- [ ] Done

### Step 2: Modify `apps/web/package.json`

Drop CF devDeps and update scripts.

```diff
"devDependencies": {
-  "@cloudflare/vite-plugin": "catalog:",
-  "@dotenvx/dotenvx": "catalog:",
   // keep other deps
-  "cross-env": "catalog:",
-  "wrangler": "catalog:"
}
```

Update scripts (drop CF env vars):

```json
"scripts": {
  "dev": "pnpm dotenvx run -f ../../packages/env/.env -- vp dev",
  "build": "vp build",
  "start": "node .output/server/index.mjs",
  "preview": "pnpm dotenvx run -f ../../packages/env/.env -- vp preview",
  "check": "vp check",
  "check:fix": "vp check --fix",
  "ui": "vpx shadcn@latest"
}
```

Drop `cf-typegen`, `deploy`, `logs` scripts.

- [ ] Done

### Step 3: Modify `apps/server/Dockerfile`

Port 5000 → 5100. Build via `vp pack`. CMD `node dist/index.mjs`. Keep the existing `node:25-bookworm-slim` + Vite Plus pattern.

Update the `vp run -v --filter server build` line and the COPY/CMD lines:

```diff
-COPY --from=builder --chown=server:nodejs /app/apps/server/.output /app/.output
+COPY --from=builder --chown=server:nodejs /app/apps/server/dist /app/dist
-COPY --from=builder --chown=server:nodejs /app/packages/db/migrations /app/.output/migrations
+COPY --from=builder --chown=server:nodejs /app/packages/db/migrations /app/dist/migrations

-ENV PORT=5000
+ENV PORT=5100

 HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
-  CMD wget -qO- http://127.0.0.1:${PORT}$(echo ${VITE_SERVER_URL} | sed 's|^http[s]*://[^/]*||' | sed 's|/$||')/health/live || exit 1
+  CMD wget -qO- http://127.0.0.1:${PORT}/health/live || exit 1

-CMD ["node", "/app/.output/index.mjs", "--hostname", "0.0.0.0"]
+CMD ["node", "/app/dist/index.mjs"]
```

Also: drop the `RUN vp run -v --filter server build` line if Task 1 rewired it to `vp pack` — actually keep `vp run -v --filter server build` since the script in `package.json` now invokes `vp pack` underneath. The Dockerfile calls the package's build script which will dispatch to `vp pack`.

- [ ] Done

### Step 4: Modify `apps/web/Dockerfile`

Drop CF build args. The Dockerfile's existing `--filter web build` already produces `.output/server/index.mjs` via Nitro (TanStack Start's default Node.js target), so no other change to the CMD/healthcheck is needed — just drop the `SERVICE_URL_*`/CF env refs from the `ARG`/`ENV` block.

- [ ] Done

### Step 5: Create `docker-compose.yaml`

Full-stack Dokploy-style compose — all 6 services with Traefik labels.

```yaml
name: personal-hub

services:
  postgres:
    image: postgres:17-alpine
    volumes:
      - pg_data:/var/lib/postgresql/data
      - ./scripts/init-databases.sh:/docker-entrypoint-initdb.d/init-databases.sh
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-admin}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-changeme}
      POSTGRES_DB: ${POSTGRES_DB:-personal_hub}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-admin}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --save 60 1000 --requirepass ${REDIS_PASSWORD:-changeme}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD:-changeme}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-minioadmin}

  server:
    build:
      context: .
      dockerfile: apps/server/Dockerfile
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }
      minio: { condition: service_started }
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-admin}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-personal_hub}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      S3_ENDPOINT: http://minio:9000
      S3_ACCESS_KEY: ${MINIO_ROOT_USER:-minioadmin}
      S3_SECRET_KEY: ${MINIO_ROOT_PASSWORD}
      S3_BUCKET: personal-hub
      S3_REGION: us-east-1
      S3_FORCE_PATH_STYLE: "true"
      MEDIA_PUBLIC_URL: http://minio:9000/personal-hub
      AGENT_WORKER_URL: http://agent:4111
      VITE_SERVER_URL: ${VITE_SERVER_URL}
      VITE_WEB_URL: ${VITE_WEB_URL}
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET}
      PORT: "5100"
      NODE_ENV: production
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.server.rule=PathPrefix(`/server`)"
      - "traefik.http.services.server.loadbalancer.server.port=5100"

  agent:
    build:
      context: .
      dockerfile: apps/agent/Dockerfile
    depends_on:
      postgres: { condition: service_healthy }
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-admin}:${POSTGRES_PASSWORD}@postgres:5432/mastra_agent
      NODE_ENV: production
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.agent.rule=PathPrefix(`/agent`)"
      - "traefik.http.services.agent.loadbalancer.server.port=4111"

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    depends_on:
      server: { condition: service_healthy }
    environment:
      VITE_SERVER_URL: ${VITE_SERVER_URL}
      VITE_WEB_URL: ${VITE_WEB_URL}
      DATABASE_URL: postgresql://${POSTGRES_USER:-admin}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-personal_hub}
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET}
      NODE_ENV: production
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.web.rule=PathPrefix(`/`)"
      - "traefik.http.services.web.loadbalancer.server.port=3000"

volumes:
  pg_data:
  redis_data:
  minio_data:
```

- [ ] Done

### Step 6: Create `docker-compose.prod.yml`

Production override extending `docker-compose.yaml` with explicit port mappings (Dokploy proxies TLS for us, so only needed if testing without Traefik).

```yaml
name: personal-hub

services:
  server:
    ports:
      - "${SERVER_PORT:-5100}:5100"

  agent:
    ports:
      - "${AGENT_PORT:-4111}:4111"

  web:
    ports:
      - "${WEB_PORT:-3000}:3000"

  postgres:
    ports:
      - "5432:5432"

  redis:
    ports:
      - "6379:6379"

  minio:
    ports:
      - "9000:9000"
      - "9001:9001"
```

Run with `docker compose -f docker-compose.yaml -f docker-compose.prod.yml up -d` on Dokploy.

- [ ] Done

### Step 7: Delete `docker-compose.coolify.yaml`

```bash
git rm docker-compose.coolify.yaml
```

- [ ] Done

### Step 8: Update env schema and `.env`

Already partially done in Task 2 Step 7. Add the remaining vars for completeness in `packages/env/src/server/env.ts`:

```typescript
PORT: z.coerce.number().default(5100),
REDIS_URL: z.string().optional(),
S3_ENDPOINT: z.string().optional(),
S3_ACCESS_KEY: z.string().optional(),
S3_SECRET_KEY: z.string().optional(),
S3_BUCKET: z.string().default("personal-hub"),
S3_REGION: z.string().default("us-east-1"),
S3_FORCE_PATH_STYLE: z.stringbool().default(true),
MEDIA_PUBLIC_URL: z.string().optional(),
AGENT_WORKER_URL: z.string().optional(),
OTEL_SERVICE_NAME: z.string().default("personal-hub-server"),
```

- [ ] Done

### Step 9: Create `scripts/migrate-from-neon.sh`

Temporary script for the one-time data dump from Neon to local Postgres.

```bash
#!/bin/bash
# TEMPORARY SCRIPT - DELETE AFTER USE
set -e

NEON_URL="${NEON_DATABASE_URL:?Set NEON_DATABASE_URL (the previous Neon DATABASE_URL)}"
LOCAL_URL="${DATABASE_URL:?Set DATABASE_URL to local Postgres}"

echo "Exporting from Neon..."
pg_dump "$NEON_URL" -Fc > /tmp/personal_hub.dump

echo "Importing to local PostgreSQL ($LOCAL_URL)..."
pg_restore "$LOCAL_URL" --clean --if-exists --no-owner --no-privileges

echo "Migration complete!"
echo "DELETE THIS SCRIPT AFTER USE"
```

Make it executable:

```bash
chmod +x scripts/migrate-from-neon.sh
```

- [ ] Done

### Step 10: Update `.gitignore`

Add:

```
*.dump
```

The `.env` files are already gitignored per the existing repo config (verify before listing — `git check-ignore packages/env/.env`).

- [ ] Done

### Step 11: Build, deploy, smoke test

```bash
# Build all three images
docker compose -f docker-compose.yaml -f docker-compose.prod.yml build
# Expected: 3 app images + 3 infra images resolve cleanly

# Bring everything up
docker compose -f docker-compose.yaml -f docker-compose.prod.yml up -d
docker compose -f docker-compose.yaml -f docker-compose.prod.yml ps
# Expected: postgres, redis, minio (healthy); server, agent, web (started)

# Smoke test
curl http://localhost:5100/health/ready  # server
# Expected: {"status":"healthy",...}
curl http://localhost:3000/              # web
# Expected: HTML from TanStack Start
curl http://localhost:4111/api/agents     # agent
# Expected: JSON array

# Sign in via web UI (Better Auth), create a portfolio entry, verify it shows in the list
# Manual: exercise end-to-end auth + DB + upload
```

- [ ] Done

### Step 12: Final cleanup verification

```bash
grep -r "wrangler\|DurableObject\|CloudflareDeployer\|cloudflare:workers" \
  apps/ packages/ \
  --include="*.ts" --include="*.json" --include="*.jsonc"
# Expected: 0 matches across the whole codebase
```

If any match, remove them.

- [ ] Done

### Step 13: Delete temporary migration script

```bash
git rm scripts/migrate-from-neon.sh
```

- [ ] Done

### Step 14: Run final workspace validation

```bash
vp run -w fix   # workspace-wide lint/format/typecheck
vp run build    # all packages build
```

Expected: both green.

- [ ] Done

### Step 15: Final commit

```bash
git add .
git commit -m "feat: complete self-hosted migration (Dokploy + Traefik + Node.js)"
```

- [ ] Done

---

## Summary

| Task      | Description                                                                             | Est. Time   |
| --------- | --------------------------------------------------------------------------------------- | ----------- |
| 1         | Server build pipeline → Node.js (vp pack + @hono/node-server)                           | 0.5 day     |
| 2         | Replace 5 CF bindings with Node.js modules (Redis, S3, broadcast, HTTP, drop waitUntil) | 0.5 day     |
| 3         | Socket.IO gateway replaces Durable Object                                               | 0.25 day    |
| 4         | Agent migration (PostgresStore, drop CF deployer)                                       | 0.25 day    |
| 5         | Web migration + Dokploy deployment compose                                              | 0.5 day     |
| **Total** |                                                                                         | **~2 days** |

## Risk Notes

| Task | Risk                                                                      | Mitigation                                                                                                                                       |
| ---- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | `vp pack` might not produce an immediately-runnable Node bundle for Hono  | Test build output before refactoring `app.ts`; if `vp pack` config is wrong, fall back to `tsx` for dev + manual `esbuild` bundle for prod       |
| 2    | `createContext` signature change touches every oRPC consumer              | Only one consumer (`app.ts` middleware) calls `createContext` directly; all routers receive the context as a parameter — they don't call it      |
| 2    | `files-sdk/s3` adapter signature differs from `files-sdk/r2`              | Verified via `files-sdk/dist/s3/index.d.ts` — accepts `bucket`, `endpoint`, `forcePathStyle`, `credentials`, `publicBaseUrl` (matches MinIO)     |
| 3    | Socket.IO client switch breaks the browser connection                     | Browser already uses raw `WebSocket`; switching to `socket.io-client` is one import change with manual test                                      |
| 4    | Mastra's `PostgresStore` requires extra schema setup                      | Mastra auto-creates its schema on init per docs (verified via context7)                                                                          |
| 5    | `services web/Dockerfile` prerender block still queries Neon during build | Documented in existing Dockerfile's prerender section — point `DATABASE_URL` at local Postgres for the build, or skip prerender during migration |
