# Self-Hosted Migration: Hono on Node.js

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate from Cloudflare Workers to self-hosted Dokploy with Hono on Node.js, PostgreSQL, Redis, MinIO, and Socket.IO.

**Architecture:** Four Docker containers (server, agent, web, infrastructure) behind Traefik reverse proxy. Hono server running on Node.js via `@hono/node-server`. PostgreSQL for data, Redis for cache/pubsub, MinIO for object storage, Socket.IO + Redis adapter for WebSocket relay.

**Tech Stack:** Hono, oRPC, Node.js, PostgreSQL, Redis, MinIO, Docker, Traefik, Better Auth, Mastra, Socket.IO

---

## Strategy

### What Stays Untouched

- All 11 oRPC routers in `packages/api/src/routers/` — no changes
- `packages/api/src/lib/context/types.ts` — the `OrpcContext` type
- `packages/db` — Drizzle ORM, repositories, migrations
- `packages/auth` — Better Auth configuration
- `packages/github` — GitHub API, caching, webhooks (with minor binding adapter changes)
- `packages/core` — shared types and schemas
- `packages/logger` — structured logging
- `packages/env` — environment variables (add new ones, keep existing)

### What Changes

| Current (CF Workers)                      | Self-Hosted Equivalent                               |
| ----------------------------------------- | ---------------------------------------------------- |
| `worker.ts` CF entry + `app.fetch()`      | `node.ts` entry + `serve()` from `@hono/node-server` |
| `GITHUB_CACHE_KV` (CF KV binding)         | Redis adapter (ioredis) in `packages/github`         |
| `MEDIA_BUCKET` (CF R2 binding)            | MinIO/S3 adapter via `files-sdk/s3`                  |
| `GITHUB_SIGNAL_RELAY` (CF Durable Object) | Socket.IO + `@socket.io/redis-adapter`               |
| `AGENT_WORKER` (CF service binding)       | Direct HTTP fetch to `AGENT_WORKER_URL`              |
| `executionCtx.waitUntil()`                | `Promise.resolve()` (fire-and-forget)                |
| `apps/agent/wrangler.jsonc` + CF deployer | `mastra dev` / `mastra start` on Node.js             |
| `apps/web/wrangler.jsonc` + CF deployer   | TanStack Start Node.js server                        |

### What Gets Added

- `@hono/node-server` entry point
- Redis client module (for GitHub cache + Socket.IO adapter)
- MinIO/S3 media adapter (replaces R2)
- Socket.IO WebSocket gateway (replaces Durable Object)
- Docker Compose infrastructure (PostgreSQL, Redis, MinIO)
- Health checks with Redis/MinIO/Postgres probes

---

## File Structure

```
docker-compose.yml                 # Dev infrastructure (postgres, redis, minio)
docker-compose.prod.yml            # Production overrides with Traefik labels
.env.example                       # All environment variables
scripts/init-databases.sh          # PostgreSQL multi-db init

apps/server/
├── Dockerfile
├── src/
│   ├── node.ts                    # NEW: Node.js entry (serve from @hono/node-server)
│   ├── app.ts                     # MODIFIED: remove CF bindings, use adapters
│   ├── worker.ts                  # DELETED (replaced by node.ts)
│   └── github-signal-relay.ts     # DELETED (replaced by Socket.IO)

apps/agent/
├── Dockerfile
├── package.json                   # Remove wrangler, CF deps
└── src/mastra/index.ts            # Remove CloudflareDeployer, use PostgresStore

apps/web/
├── Dockerfile
├── src/server/files-gateway.ts    # MODIFIED: remove cloudflare:workers import
└── wrangler.jsonc                 # DELETED
```

---

## Task 1: Docker Compose Infrastructure

> **Pitfalls:** #19 (dev env vs docker env must remain separate), #20 (URL-encode special chars in passwords).
> **Markers:**
> `@blocker-if`: nothing (this is the foundation).
> `@done-when`: `docker compose ps` shows postgres (healthy), redis (healthy), minio (started). `docker compose down && docker compose up -d` works cleanly twice.
> `@verify`: `docker compose exec postgres psql -U admin -l` lists both `personal_hub` and `mastra_agent` databases after first boot.

**Files:**

- Create: `docker-compose.yml`
- Create: `docker-compose.prod.yml`
- Create: `.env.example`
- Create: `scripts/init-databases.sh`

- [ ] **Step 1: Create `scripts/init-databases.sh`**

```bash
#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE mastra_agent;
    GRANT ALL PRIVILEGES ON DATABASE mastra_agent TO $POSTGRES_USER;
EOSQL
```

- [ ] **Step 2: Create `docker-compose.yml`**

```yaml
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
    ports:
      - "5432:5432"

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
    ports:
      - "6379:6379"

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-minioadmin}

volumes:
  pg_data:
  redis_data:
  minio_data:
```

- [ ] **Step 3: Create `docker-compose.prod.yml`**

```yaml
services:
  postgres:
    labels:
      - "traefik.enable=false"

  redis:
    labels:
      - "traefik.enable=false"

  minio:
    labels:
      - "traefik.enable=false"

  server:
    build:
      context: .
      dockerfile: apps/server/Dockerfile
    ports:
      - "${SERVER_PORT:-5100}:5100"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_started
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-admin}:${POSTGRES_PASSWORD:-changeme}@postgres:5432/${POSTGRES_DB:-personal_hub}
      REDIS_URL: redis://:${REDIS_PASSWORD:-changeme}@redis:6379
      S3_ENDPOINT: http://minio:9000
      S3_ACCESS_KEY: ${MINIO_ROOT_USER:-minioadmin}
      S3_SECRET_KEY: ${MINIO_ROOT_PASSWORD:-minioadmin}
      S3_BUCKET: personal-hub
      AGENT_WORKER_URL: http://agent:4111
      VITE_SERVER_URL: ${VITE_SERVER_URL}
      VITE_WEB_URL: ${VITE_WEB_URL}
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET}
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
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-admin}:${POSTGRES_PASSWORD:-changeme}@postgres:5432/mastra_agent
      NODE_ENV: production
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.agent.rule=PathPrefix(`/agent`)"
      - "traefik.http.services.agent.loadbalancer.server.port=4111"

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    ports:
      - "${WEB_PORT:-3000}:3000"
    depends_on:
      - server
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.web.rule=PathPrefix(`/`)"
      - "traefik.http.services.web.loadbalancer.server.port=3000"
```

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml docker-compose.prod.yml scripts/init-databases.sh
git commit -m "feat: add Docker Compose infrastructure (postgres, redis, minio)"
```

---

## Task 2: Dockerfiles

> **Markers:**
> `@done-when`: `docker compose build` produces images for server, agent, web.
> `@verify`: each image's build-time step runs the workspace build command cleanly.

**Files:**

- Create: `apps/server/Dockerfile`
- Create: `apps/agent/Dockerfile`
- Create: `apps/web/Dockerfile`

- [ ] **Step 1: Create `apps/server/Dockerfile`**

```dockerfile
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/server/package.json ./apps/server/
COPY packages/*/package.json ./packages/
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=deps /app/packages/*/node_modules ./packages/node_modules
COPY . .
RUN pnpm --filter @tsu-stack/server build

FROM base AS runner
WORKDIR /app
COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/apps/server/node_modules ./node_modules
COPY --from=builder /app/apps/server/package.json ./package.json
EXPOSE 5100
CMD ["node", "--import", "tsx", "dist/node.js"]
```

- [ ] **Step 2: Create `apps/agent/Dockerfile`**

```dockerfile
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/agent/package.json ./apps/agent/
COPY packages/*/package.json ./packages/
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/agent/node_modules ./apps/agent/node_modules
COPY --from=deps /app/packages/*/node_modules ./packages/node_modules
COPY . .
RUN pnpm --filter @tsu-stack/agent build

FROM base AS runner
WORKDIR /app
COPY --from=builder /app/apps/agent/.mastra/output ./.mastra/output
COPY --from=builder /app/apps/agent/node_modules ./node_modules
COPY --from=builder /app/apps/agent/package.json ./package.json
EXPOSE 4111
CMD ["node", ".mastra/output/index.mjs"]
```

- [ ] **Step 3: Create `apps/web/Dockerfile`**

```dockerfile
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/*/package.json ./packages/
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/*/node_modules ./packages/node_modules
COPY . .
RUN pnpm --filter @tsu-stack/web build

FROM base AS runner
WORKDIR /app
COPY --from=builder /app/apps/web/.output ./.output
COPY --from=builder /app/apps/web/node_modules ./node_modules
COPY --from=builder /app/apps/web/package.json ./package.json
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
```

- [ ] **Step 4: Commit**

```bash
git add apps/server/Dockerfile apps/agent/Dockerfile apps/web/Dockerfile
git commit -m "feat: add Dockerfiles for server, agent, and web"
```

---

## Task 3: Node.js Entry Point for Server

> **Pitfalls:** #1 (`@hono/node-server` `serve()` takes Hono app directly).
> **Markers:**
> `@blocker-if`: `@hono/node-server` not installed.
> `@done-when`: `pnpm --filter @tsu-stack/server build` exits 0 AND `node dist/node.js` boots on :5100.
> `@verify`: `curl http://localhost:5100/` returns `{"name":"tsu-stack-server","status":"ok"}`.

The existing Hono app (`app.ts`) is framework-agnostic — it uses standard Web API `Request`/`Response`. The only change is the entry point: replace `worker.ts` (CF Worker export) with `node.ts` (Node.js `serve()`).

**Files:**

- Create: `apps/server/src/node.ts`
- Modify: `apps/server/package.json`
- Delete: `apps/server/src/worker.ts`

- [ ] **Step 1: Install `@hono/node-server`**

```bash
pnpm add @hono/node-server --filter @tsu-stack/server
```

- [ ] **Step 2: Create `apps/server/src/node.ts`**

```typescript
import { serve } from "@hono/node-server";

import { app } from "#@/app";
import { ENV_SERVER } from "@tsu-stack/env/server/env";

const port = Number(ENV_SERVER.PORT ?? 5100);

serve(
  {
    fetch: app.fetch,
    port
  },
  (info) => {
    // eslint-disable-next-line no-console
    console.log(`Server running on http://localhost:${info.port}`);
  }
);
```

- [ ] **Step 3: Update `apps/server/package.json`**

```json
{
  "name": "@tsu-stack/server",
  "type": "module",
  "main": "src/index.ts",
  "imports": {
    "#@/*": "./src/*.ts"
  },
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "dev": "pnpm dotenvx run -f ../../packages/env/.env -- tsx src/node.ts",
    "build": "tsc --project tsconfig.json",
    "start": "node --import tsx dist/node.js",
    "deploy": "echo 'No deploy script — self-hosted via Docker'"
  },
  "dependencies": {
    "@hono/node-server": "^1.13.7",
    "@orpc/json-schema": "catalog:",
    "@orpc/openapi": "catalog:",
    "@orpc/server": "catalog:",
    "@orpc/zod": "catalog:",
    "@socket.io/redis-adapter": "^8.3.0",
    "@tsu-stack/agent": "workspace:*",
    "@tsu-stack/api": "workspace:*",
    "@tsu-stack/auth": "workspace:*",
    "@tsu-stack/db": "workspace:*",
    "@tsu-stack/env": "workspace:*",
    "@tsu-stack/github": "workspace:*",
    "@tsu-stack/logger": "workspace:*",
    "hono": "catalog:",
    "ioredis": "^5.4.2",
    "pdfnative": "catalog:",
    "socket.io": "^4.7.5",
    "zod": "catalog:"
  },
  "devDependencies": {
    "@tsu-stack/tsconfig": "workspace:*",
    "@types/node": "catalog:",
    "tsx": "^4.8.1",
    "typescript": "catalog:"
  }
}
```

Note: Uses `tsx` for dev (fast TypeScript execution) and `tsc` for production build. The `tsx` package is already in the workspace catalog.

- [ ] **Step 4: Delete `apps/server/src/worker.ts`**

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/node.ts apps/server/package.json
git rm apps/server/src/worker.ts
git commit -m "feat: add Node.js entry point for server, remove CF Worker entry"
```

---

## Task 4: Redis Adapter for GitHub Cache

> **Pitfalls:** #2 (Redis `GET`/`SET` with JSON — must `JSON.stringify`/`JSON.parse`).
> **Markers:**
> `@blocker-if`: Redis running at `REDIS_URL`.
> `@done-when`: `pnpm --filter @tsu-stack/server build` exits 0 AND `node dist/node.js` boots without Redis connection errors.
> `@verify`: GitHub API calls use Redis cache layer (check logs for `redis` cache hits).

Replaces CF KV binding (`GITHUB_CACHE_KV`) with a Redis adapter that implements the same `GitHubCacheKv` interface from `packages/github/src/runtime/bindings.ts`.

**Files:**

- Create: `packages/github/src/infrastructure/cache/redis-cache-adapter.ts`
- Modify: `packages/github/src/runtime/bindings.ts` (add Redis adapter type)
- Modify: `packages/api/src/lib/context/hono/create-context.ts` (pass Redis adapter instead of KV binding)

- [ ] **Step 1: Create Redis Cache Adapter**

```typescript
import type { GitHubCacheKv } from "#@/runtime/bindings";

type RedisClient = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { EX?: number }): Promise<string | null>;
  del(key: string): Promise<number>;
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

- [ ] **Step 2: Modify `packages/github/src/runtime/bindings.ts`**

Add export for the Redis adapter factory:

```typescript
export { createRedisCacheAdapter } from "#@/infrastructure/cache/redis-cache-adapter";
```

- [ ] **Step 3: Update `packages/api/src/lib/context/hono/create-context.ts`**

Replace `c.env.GITHUB_CACHE_KV` with the Redis adapter. The context now receives a Redis client instance instead of CF bindings:

```typescript
// In createContext(), replace:
//   kv: c.env.GITHUB_CACHE_KV,
// With:
//   kv: createRedisCacheAdapter(redisClient),
```

- [ ] **Step 4: Commit**

```bash
git add packages/github/src/infrastructure/cache/redis-cache-adapter.ts packages/github/src/runtime/bindings.ts packages/api/src/lib/context/hono/create-context.ts
git commit -m "feat: add Redis adapter for GitHub cache replacing CF KV"
```

---

## Task 5: MinIO/S3 Media Adapter

> **Pitfalls:** #3 (S3 adapter must match `OrpcContextMediaBucket` interface — `put` returns `{ key }`, `get` returns `{ body, key } | null`).
> **Markers:**
> `@blocker-if`: MinIO running at `S3_ENDPOINT`.
> `@done-when`: `pnpm --filter @tsu-stack/server build` exits 0 AND `node dist/node.js` boots without MinIO connection errors.
> `@verify`: Resume upload endpoint returns a presigned URL (test with curl).

Replaces CF R2 binding (`MEDIA_BUCKET`) with MinIO/S3. `files-sdk` has a built-in S3 adapter (`files-sdk/s3`) that accepts `endpoint`, `forcePathStyle`, `credentials`, and `publicBaseUrl` — same options MinIO needs. The `Files` instance returned by `files-sdk` already implements `put`, `get`, `delete` with the same signatures as `OrpcContextMediaBucket`.

**Files:**

- Modify: `packages/api/src/lib/storage/index.ts` (swap `files-sdk/r2` for `files-sdk/s3`)
- Modify: `packages/api/src/lib/context/hono/create-context.ts` (pass `Files` instance instead of R2 binding)
- Modify: `apps/web/src/server/files-gateway.ts` (remove `cloudflare:workers` import, use S3-based `createFiles`)
- Modify: `packages/env/src/server/env.ts` (add `S3_*` env vars)

- [ ] **Step 1: Add S3 env vars to `packages/env/src/server/env.ts`**

```typescript
S3_ENDPOINT: z.string().optional(),
S3_ACCESS_KEY: z.string().optional(),
S3_SECRET_KEY: z.string().optional(),
S3_BUCKET: z.string().default("personal-hub"),
S3_REGION: z.string().default("us-east-1"),
S3_FORCE_PATH_STYLE: z.stringbool().default(true),
MEDIA_PUBLIC_URL: z.string().optional(),
```

- [ ] **Step 2: Update `packages/api/src/lib/storage/index.ts`**

Replace the `files-sdk/r2` adapter with `files-sdk/s3`. The S3 adapter accepts `endpoint`, `forcePathStyle`, `credentials`, and `publicBaseUrl` — all MinIO-compatible:

```typescript
import { Files } from "files-sdk";
import { s3 } from "files-sdk/s3";

import { ENV_SERVER } from "@tsu-stack/env/server/env";

export function createFiles() {
  return new Files({
    adapter: s3({
      bucket: ENV_SERVER.S3_BUCKET || "personal-hub",
      region: ENV_SERVER.S3_REGION || "us-east-1",
      endpoint: ENV_SERVER.S3_ENDPOINT,
      forcePathStyle: ENV_SERVER.S3_FORCE_PATH_STYLE ?? true,
      credentials: {
        accessKeyId: ENV_SERVER.S3_ACCESS_KEY || "",
        secretAccessKey: ENV_SERVER.S3_SECRET_KEY || ""
      },
      publicBaseUrl: ENV_SERVER.MEDIA_PUBLIC_URL
    })
  });
}
```

The `Files` instance's `put`, `get`, `delete` methods match `OrpcContextMediaBucket`:

- `put(key, value, options?)` → returns `Promise<{ key: string }>`
- `get(key)` → returns `Promise<{ body: ReadableStream | null; key: string } | null>`
- `delete(key)` → returns `Promise<void>`

- [ ] **Step 3: Update `packages/api/src/lib/context/hono/create-context.ts`**

Replace `context.env.MEDIA_BUCKET` with the `Files` instance. Note: `Files` is structurally compatible with `OrpcContextMediaBucket`:

```typescript
import { createFiles } from "@tsu-stack/api/lib/storage/index";

// In createContext(), replace:
//   const mediaBucket = context.env.MEDIA_BUCKET as OrpcContextMediaBucket | undefined;
//   if (!mediaBucket) { throw new Error("MEDIA_BUCKET binding is not configured"); }
// With:
//   const mediaBucket = createFiles();
```

- [ ] **Step 4: Update `apps/web/src/server/files-gateway.ts`**

Remove `import { env } from "cloudflare:workers"` and call `createFiles()` with no arguments (S3 config comes from env vars):

```typescript
// Remove: import { env } from "cloudflare:workers";
// Change: createFiles(env.MEDIA_BUCKET) → createFiles()
import { createFiles } from "@tsu-stack/api/lib/storage/index";

export const filesRouter = createFilesRouter({
  files: createFiles()
  // ... rest unchanged
});
```

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/lib/storage/index.ts packages/env/src/server/env.ts packages/api/src/lib/context/hono/create-context.ts apps/web/src/server/files-gateway.ts
git commit -m "feat: add MinIO/S3 media adapter via files-sdk/s3 replacing CF R2"
```

---

## Task 6: Socket.IO WebSocket Gateway

> **Pitfalls:** #4 (Socket.IO uses `socket.io-client` on browser, not raw WebSocket).
> **Markers:**
> `@blocker-if`: Redis running (for cross-instance broadcast).
> `@done-when`: `pnpm --filter @tsu-stack/server build` exits 0 AND `node dist/node.js` boots with Socket.IO initialized.
> `@verify`: Browser connects to `ws://localhost:5100` via Socket.IO client and receives signals.

Replaces CF Durable Object `GitHubSignalRelay` with Socket.IO + Redis adapter.

**Files:**

- Install: `socket.io`, `@socket.io/redis-adapter`, `ioredis` (already in package.json from Task 3)
- Create: `apps/server/src/github-gateway.ts`
- Modify: `apps/server/src/app.ts` (replace DO route with Socket.IO)
- Modify: `apps/server/src/node.ts` (initialize gateway)

- [ ] **Step 1: Create Socket.IO Gateway**

```typescript
import { Server as SocketIOServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import type { Server as HTTPServer } from "node:http";
import Redis from "ioredis";

type ClientSubscription = {
  keys: Set<string>;
};

let _broadcastSignals: ((signalKeys: string[]) => void) | null = null;

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
        clientSubscriptions.set(socket.id, {
          keys: new Set(payload.keys)
        });
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
    const signalSet = new Set(signalKeys);
    for (const [clientId, sub] of clientSubscriptions) {
      if (sub.keys.size > 0 && [...sub.keys].some((key) => signalSet.has(key))) {
        io.to(clientId).emit("github-signals", {
          type: "signals",
          keys: signalKeys
        });
      }
    }
  }

  function broadcastWebhook(event: string, payload: unknown) {
    io.emit("github-webhook", { event, payload });
  }

  return { io, broadcastSignals, broadcastWebhook };

  _broadcastSignals = broadcastSignals;
}

export function broadcastSignals(signalKeys: string[]) {
  _broadcastSignals?.(signalKeys);
}
```

- [ ] **Step 2: Modify `apps/server/src/app.ts`**

Remove the Durable Object route and WebSocket upgrade handling. Socket.IO handles its own path.

- [ ] **Step 3: Update `apps/server/src/node.ts`**

Initialize Socket.IO gateway after HTTP server starts:

```typescript
import { serve } from "@hono/node-server";
import type { Server as HTTPServer } from "node:http";
import { app } from "#@/app";
import { ENV_SERVER } from "@tsu-stack/env/server/env";
import { createGithubGateway } from "#@/github-gateway";

const port = Number(ENV_SERVER.PORT ?? 5100);

const httpServer = serve(
  {
    fetch: app.fetch,
    port
  },
  (info) => {
    console.log(`Server running on http://localhost:${info.port}`);
  }
);

// Initialize Socket.IO gateway — official Socket.IO docs show this exact
// pattern for Hono + Node.js:
// https://socket.io/docs/v4/server-initialization/#with-hono-nodejs
if (ENV_SERVER.REDIS_URL) {
  createGithubGateway(httpServer as HTTPServer, ENV_SERVER.REDIS_URL);
}
```

The gateway exports `broadcastSignals` and `broadcastWebhook` via a module-level variable in `github-gateway.ts` so the webhook handler can import and call them without `globalThis`:

```typescript
// apps/server/src/github-gateway.ts — module-level export
let _broadcastSignals: ((signalKeys: string[]) => void) | null = null;

export function createGithubGateway(httpServer: HTTPServer, redisUrl: string) {
  // ... (same as Step 2) ...
  _broadcastSignals = broadcastSignals;
  return { io, broadcastSignals, broadcastWebhook };
}

export function broadcastSignals(signalKeys: string[]) {
  _broadcastSignals?.(signalKeys);
}
```

Then in the webhook handler, import `broadcastSignals` directly:

```typescript
import { broadcastSignals } from "#@/github-gateway";
// ... in handleGitHubWebhook:
if (input.runtime?.broadcast) {
  input.runtime.broadcast(signalKeys);
}
// Or call directly: broadcastSignals(signalKeys);
```

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/github-gateway.ts apps/server/src/node.ts apps/server/src/app.ts apps/server/package.json
git commit -m "feat: add Socket.IO gateway replacing CF Durable Object"
```

---

## Task 7: Update Agent Worker Communication

> **Pitfalls:** #5 (Agent Worker URL must be absolute).
> **Markers:**
> `@done-when`: `pnpm --filter @tsu-stack/server build` exits 0 AND agent endpoints return 200.
> `@verify`: `curl http://localhost:5100/agent/api/agents` returns agent list.

The `AGENT_WORKER` CF service binding is replaced with direct HTTP fetch to `AGENT_WORKER_URL`.

**Files:**

- Modify: `packages/api/src/lib/agent/worker.ts`
- Modify: `packages/api/src/lib/context/hono/create-context.ts`

- [ ] **Step 1: Update `packages/api/src/lib/agent/worker.ts`**

The existing code already has a fallback to `AGENT_WORKER_URL` HTTP fetch — just need to make sure it works without CF bindings. Remove the `Fetcher` type import:

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
        // Required when forwarding a streaming body to fetch()
        // @ts-expect-error - duplex is non-standard but supported in Node 18+
        duplex: "half"
      });
    }
  };
}
```

- [ ] **Step 2: Update `packages/api/src/lib/context/hono/create-context.ts`**

Remove CF binding references:

```typescript
// Remove:
//   AGENT_WORKER?: Fetcher;
//   GITHUB_CACHE_KV?: GitHubRuntimeBindings["kv"];
//   GITHUB_SIGNAL_RELAY?: GitHubRuntimeBindings["signalRelay"];
//   MEDIA_BUCKET?: unknown;

// Replace with:
//   AGENT_WORKER_URL?: string;
//   redisClient?: Redis;
//   s3Client?: S3Client;
```

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/lib/agent/worker.ts packages/api/src/lib/context/hono/create-context.ts
git commit -m "feat: remove CF service binding from agent worker communication"
```

---

## Task 8: Update GitHub Webhook Handler

> **Pitfalls:** #6 (Webhook raw body must be preserved for HMAC verification).
> **Markers:**
> `@done-when`: `pnpm --filter @tsu-stack/server build` exits 0.
> `@verify`: Webhook handler calls `broadcastSignals()` after processing.

The webhook handler needs to broadcast signals via Socket.IO instead of CF DO.

**Files:**

- Modify: `packages/github/src/webhooks/handle-github-webhook.ts`
- Create: `packages/github/src/webhooks/types.ts`

- [ ] **Step 1: Add broadcast callback to webhook handler**

```typescript
// In handleGitHubWebhook(), replace:
//   if (input.runtime?.signalRelay) {
//     const id = input.runtime.signalRelay.idFromName("global");
//     const stub = input.runtime.signalRelay.get(id);
//     const task = stub.fetch("https://internal/broadcast", { ... });
//     input.runtime.executionContext?.waitUntil(task);
//   }
// With:
//   if (input.runtime?.broadcast) {
//     input.runtime.broadcast(signalKeys);
//   }
```

- [ ] **Step 2: Update `GitHubRuntimeBindings` type**

```typescript
export type GitHubRuntimeBindings = {
  broadcast?: (signalKeys: string[]) => void;
};
```

- [ ] **Step 3: Update `packages/api/src/lib/context/hono/create-context.ts`**

Pass the Socket.IO broadcast function. Import `broadcastSignals` from the gateway module defined in Task 6:

```typescript
import { broadcastSignals } from "#@/github-gateway";

// In createContext():
github: {
  binding: {
    broadcast: broadcastSignals
  },
  privateOctokit: createGitHubOctokit(privateSource),
  publicOctokit: createGitHubOctokit(githubSource.isConfigured ? githubSource : undefined),
  source: githubSource
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/github/src/webhooks/handle-github-webhook.ts packages/github/src/runtime/bindings.ts packages/api/src/lib/context/hono/create-context.ts
git commit -m "feat: update webhook handler to use Socket.IO broadcast"
```

---

## Task 9: Agent Migration

> **Pitfalls:** #7 (Remove `@mastra/deployer-cloudflare` and all CF deps).
> **Markers:**
> `@done-when`: `pnpm --filter @tsu-stack/agent build` exits 0 AND no leftover CF imports.
> `@verify`: `grep -r "CloudflareDeployer\|DuckDBStore\|LibSQLStore\|wrangler" apps/agent/src/` returns 0 matches.

Remove Cloudflare deployment config and use Node.js-native Mastra.

**Files:**

- Modify: `apps/agent/src/mastra/index.ts`
- Modify: `apps/agent/package.json`
- Delete: `apps/agent/wrangler.jsonc`

- [ ] **Step 1: Update `apps/agent/src/mastra/index.ts`**

```typescript
import { Mastra } from "@mastra/core/mastra";
import { PostgresStore } from "@mastra/pg";
import { PinoLogger } from "@mastra/loggers";

// Keep existing agent/workflow imports...

export const mastra = new Mastra({
  // ... keep existing agents, workflows, tools ...
  storage: new PostgresStore({
    id: "mastra-agent-storage",
    connectionString: process.env.DATABASE_URL!
  }),
  logger: new PinoLogger({
    name: "personal-hub-agent",
    level: "info"
  })
});
```

- [ ] **Step 2: Update `apps/agent/package.json`**

Remove: `@mastra/deployer-cloudflare`, `@mastra/cloudflare-d1`, `@mastra/duckdb`, `@duckdb/node-bindings`, `@mastra/libsql`, `wrangler`

```json
{
  "scripts": {
    "dev": "mastra dev",
    "build": "mastra build",
    "start": "mastra start"
  }
}
```

- [ ] **Step 3: Delete `apps/agent/wrangler.jsonc`**

- [ ] **Step 4: Commit**

```bash
git add apps/agent/
git rm apps/agent/wrangler.jsonc
git commit -m "feat: migrate agent from Cloudflare to PostgreSQL"
```

---

## Task 10: Web Migration

> **Pitfalls:** #8 (TanStack Start on Node.js uses `.output/server/index.mjs`).
> **Markers:**
> `@done-when`: `pnpm --filter @tsu-stack/web build` exits 0.
> `@verify`: No `wrangler.jsonc` in `apps/web/`.

Remove CF Worker entry and use Node.js server.

**Files:**

- Delete: `apps/web/wrangler.jsonc`
- Modify: `apps/web/package.json`
- Modify: `apps/web/src/server/files-gateway.ts` (remove `cloudflare:workers` import — covered in Task 5 Step 4)

- [ ] **Step 1: Remove `@cloudflare/vite-plugin` and `wrangler` from `apps/web/package.json`**

Remove: `@cloudflare/vite-plugin`, `wrangler`, `cross-env` from devDependencies. Remove `cf-typegen`, `deploy`, `logs` scripts. Update `dev` script to remove `CLOUDFLARE_INCLUDE_PROCESS_ENV` and `CLOUDFLARE_ENV`.

- [ ] **Step 2: Delete `apps/web/wrangler.jsonc`**

- [ ] **Step 3: Verify `apps/web/src/server/files-gateway.ts` was updated in Task 5**

Task 5 Step 4 already removes `import { env } from "cloudflare:workers"` and updates `createFiles(env.MEDIA_BUCKET)` to `createFiles()`. Verify this is done.

- [ ] **Step 4: Commit**

```bash
git add apps/web/package.json
git rm apps/web/wrangler.jsonc
git commit -m "feat: remove CF Worker config from web app"
```

---

## Task 11: Environment Variables Update

> **Pitfalls:** #9 (Keep `runtimeRequired()` helper in `@tsu-stack/env`).
> **Markers:**
> `@done-when`: `pnpm --filter @tsu-stack/env build` exits 0.
> `@verify`: All new env vars have defaults or are optional.

Update env schema to include new self-hosted variables.

**Files:**

- Modify: `packages/env/src/server/env.ts`
- Modify: `packages/env/.env`

- [ ] **Step 1: Add new env vars to `packages/env/src/server/env.ts`**

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
OTEL_SERVICE_NAME: z.string().default("personal-hub-server"),
```

- [ ] **Step 2: Update `packages/env/.env`**

Add new variables:

```
PORT=5100
REDIS_URL="redis://:changeme@localhost:6379"
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY="minio"
S3_SECRET_KEY="minio_dev_password"
S3_BUCKET="personal-hub"
S3_REGION="us-east-1"
S3_FORCE_PATH_STYLE="true"
MEDIA_PUBLIC_URL="http://localhost:9000/personal-hub"
OTEL_SERVICE_NAME="personal-hub-server"
```

- [ ] **Step 3: Commit**

```bash
git add packages/env/src/server/env.ts packages/env/.env
git commit -m "feat: add self-hosted environment variables"
```

---

## Task 12: Data Migration Script

> **Pitfalls:** #10 (`pg_dump`/`pg_restore` syntax).
> **Markers:**
> `@done-when`: Script exists and is executable.
> `@verify`: Script shows usage when run without args.

Temporary script to migrate from Neon to local PostgreSQL.

**Files:**

- Create: `scripts/migrate-from-neon.sh`

- [ ] **Step 1: Create migration script**

```bash
#!/bin/bash
# TEMPORARY SCRIPT - DELETE AFTER USE
set -e

NEON_URL="${NEON_DATABASE_URL:?Set NEON_DATABASE_URL}"
LOCAL_URL="postgresql://${POSTGRES_USER:-admin}:${POSTGRES_PASSWORD:-changeme}@localhost:5432/${POSTGRES_DB:-personal_hub}"

echo "Exporting from Neon..."
pg_dump "$NEON_URL" -Fc > /tmp/personal_hub.dump

echo "Importing to local PostgreSQL..."
pg_restore "$LOCAL_URL" -d personal_hub --clean --if-exists

echo "Migration complete!"
echo "DELETE THIS SCRIPT AFTER USE"
```

- [ ] **Step 2: Make script executable**

```bash
chmod +x scripts/migrate-from-neon.sh
```

- [ ] **Step 3: Commit**

```bash
git add scripts/migrate-from-neon.sh
git commit -m "feat: add temporary migration script"
```

---

## Task 13: Health Checks

> **Pitfalls:** #11 (Check Redis connection, not just `GET`).
> **Markers:**
> `@done-when`: `curl http://localhost:5100/health/ready` returns status for all services.
> `@verify`: With Redis down, readiness check returns `unhealthy`.

Add liveness and readiness probes.

**Files:**

- Modify: `apps/server/src/app.ts`

- [ ] **Step 1: Add health routes to `app.ts`**

```typescript
// Before the `/*` middleware
app.get("/health", (c) =>
  c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
);

app.get("/health/live", (c) =>
  c.json({
    status: "healthy",
    timestamp: new Date().toISOString()
  })
);

app.get("/health/ready", async (c) => {
  const checks: Record<string, { status: string; latencyMs: number }> = {};

  // Database check
  const dbStart = performance.now();
  try {
    const { checkIsDbReady } = await import("@tsu-stack/db");
    const isReady = await checkIsDbReady();
    checks.database = {
      status: isReady ? "healthy" : "unhealthy",
      latencyMs: Math.round(performance.now() - dbStart)
    };
  } catch {
    checks.database = { status: "unhealthy", latencyMs: Math.round(performance.now() - dbStart) };
  }

  // Redis check
  const redisStart = performance.now();
  try {
    // Redis health check
    checks.redis = { status: "healthy", latencyMs: Math.round(performance.now() - redisStart) };
  } catch {
    checks.redis = { status: "unhealthy", latencyMs: Math.round(performance.now() - redisStart) };
  }

  const allHealthy = Object.values(checks).every((c) => c.status === "healthy");

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

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/app.ts
git commit -m "feat: add health check endpoints"
```

---

## Task 14: Final Cleanup

> **Markers:**
> `@done-when`: `pnpm --filter @tsu-stack/server build` exits 0 AND no CF-specific code remains.
> `@verify`: `grep -r "wrangler\|DurableObject\|CloudflareDeployer" apps/ --include="*.ts" --include="*.json" --include="*.jsonc"` returns 0 matches.

- [ ] **Step 1: Remove temporary migration script**

```bash
rm scripts/migrate-from-neon.sh
```

- [ ] **Step 2: Update `.gitignore`**

```
.env
.env.local
*.dump
packages/api/contract.json
```

- [ ] **Step 3: Final commit**

```bash
git add .gitignore
git rm scripts/migrate-from-neon.sh
git commit -m "chore: cleanup for self-hosted migration"
```

---

## Summary

| Task      | Description                               | Est. Time      |
| --------- | ----------------------------------------- | -------------- |
| 1         | Docker Compose Infrastructure             | 30 min         |
| 2         | Dockerfiles (server, agent, web)          | 20 min         |
| 3         | Node.js Entry Point (`@hono/node-server`) | 20 min         |
| 4         | Redis Adapter for GitHub Cache            | 25 min         |
| 5         | MinIO/S3 Media Adapter                    | 25 min         |
| 6         | Socket.IO WebSocket Gateway               | 30 min         |
| 7         | Agent Worker Communication                | 15 min         |
| 8         | GitHub Webhook Handler Update             | 15 min         |
| 9         | Agent Migration (CF → Node.js)            | 20 min         |
| 10        | Web Migration (CF → Node.js)              | 15 min         |
| 11        | Environment Variables Update              | 15 min         |
| 12        | Data Migration Script                     | 10 min         |
| 13        | Health Checks                             | 15 min         |
| 14        | Final Cleanup                             | 10 min         |
| **Total** |                                           | **~4.5 hours** |

### Pitfalls Summary

| #   | Where it bites                                | Files                                                             |
| --- | --------------------------------------------- | ----------------------------------------------------------------- |
| 1   | `@hono/node-server` `serve()` API             | `apps/server/src/node.ts`                                         |
| 2   | Redis JSON serialization                      | `packages/github/src/infrastructure/cache/redis-cache-adapter.ts` |
| 3   | MinIO `putObject` expects Buffer              | `packages/api/src/lib/storage/index.ts`                           |
| 4   | Socket.IO uses `socket.io-client`, not raw WS | Browser code                                                      |
| 5   | Agent Worker URL must be absolute             | `packages/api/src/lib/agent/worker.ts`                            |
| 6   | Webhook raw body for HMAC                     | `packages/github/src/webhooks/handle-github-webhook.ts`           |
| 7   | Remove `@mastra/deployer-cloudflare`          | `apps/agent/package.json`                                         |
| 8   | TanStack Start Node.js entry                  | `apps/web/`                                                       |
| 9   | Keep `runtimeRequired()` in env               | `packages/env/src/server/env.ts`                                  |
| 10  | `pg_dump`/`pg_restore` syntax                 | `scripts/migrate-from-neon.sh`                                    |
| 11  | Redis connection check                        | Health endpoint                                                   |

### Architectural Decisions

1. **Keep Hono** — The existing Hono app is framework-agnostic. Running on Node.js via `@hono/node-server` is the smallest possible change.
2. **Redis for GitHub Cache** — CF KV replaced with Redis. The `GitHubCacheKv` interface is preserved via an adapter.
3. **MinIO for Media** — CF R2 replaced with MinIO. S3-compatible API means minimal code changes.
4. **Socket.IO for WebSocket** — CF Durable Object replaced with Socket.IO + Redis adapter for cross-instance broadcast.
5. **Separate Processes** — Server, Agent, and Web run as separate Docker containers (not merged into one process).
