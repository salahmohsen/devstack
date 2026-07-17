# Cloudflare Cleanup — Post-Migration Follow-Up Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all remaining Cloudflare Workers artifacts, dead Hono code, and CF-era env vars from the codebase after the self-hosted migration. Update all package.json scripts to reflect the new NestJS + MinIO + self-hosted architecture.

**Architecture:** Delete dead files first (zero-risk), then clean env schemas, then rewrite R2→MinIO storage layer, then remove dead code paths, then clean workspace config and docs. Each task is independently committable and verifiable.

**Tech Stack:** TypeScript, NestJS, MinIO, Drizzle, pnpm workspace

---

## File Map

| Action  | File                                                  | Why                                                |
| ------- | ----------------------------------------------------- | -------------------------------------------------- |
| DELETE  | `apps/server/wrangler.jsonc`                          | CF Worker config                                   |
| DELETE  | `apps/server/wrangler.dev.jsonc`                      | CF Worker dev config                               |
| DELETE  | `apps/agent/wrangler.jsonc`                           | CF Worker config for agent                         |
| DELETE  | `apps/server/worker-configuration.d.ts`               | CF auto-generated types (14k+ lines)               |
| DELETE  | `apps/web/worker-configuration.d.ts`                  | CF auto-generated types (14k+ lines)               |
| DELETE  | `packages/api/src/lib/context/hono/create-context.ts` | Dead Hono context builder                          |
| DELETE  | `packages/api/src/lib/agent/worker.ts`                | Dead CF Fetcher agent proxy                        |
| DELETE  | `packages/logger/src/server/hono/middleware.ts`       | Dead Hono logger middleware                        |
| REWRITE | `packages/api/src/lib/storage/index.ts`               | R2→MinIO/S3 adapter                                |
| REWRITE | `packages/api/src/client/tanstack-start/orpc.ts:44`   | `process.env.MEDIA_BUCKET` → MinIO                 |
| EDIT    | `packages/env/src/server/env.ts`                      | Remove CF-era vars                                 |
| EDIT    | `packages/env/src/web/env.server.ts`                  | Rename `R2_PUBLIC_BASE_URL`                        |
| EDIT    | `packages/env/.env.example`                           | Remove CF-era vars                                 |
| EDIT    | `packages/api/src/routers/health.router.ts:59`        | `WORKERS_CI_COMMIT_SHA` → `SOURCE_COMMIT`          |
| EDIT    | `packages/api/src/routers/resume.router.ts:105,130`   | R2 calls → MinIO                                   |
| EDIT    | `pnpm-workspace.yaml`                                 | Remove CF deps from catalog                        |
| EDIT    | `apps/server/vite.config.ts`                          | Remove `@cloudflare/vite-plugin`                   |
| EDIT    | `vite.config.ts`                                      | Remove `.wrangler` from ignores                    |
| EDIT    | `.agents/environment-variables.md`                    | Remove CF doc references                           |
| EDIT    | Root `package.json`                                   | Add setup/minio/migrate scripts, remove cf-typegen |
| EDIT    | `apps/server/package.json`                            | Add start:debug, lint, deploy scripts              |
| EDIT    | `apps/web/package.json`                               | Add explicit build, deploy scripts                 |
| EDIT    | `apps/agent/package.json`                             | Add start, copy:to-server scripts                  |
| EDIT    | `packages/db/package.json`                            | Add db:migrate, db:push, db:studio                 |
| EDIT    | `packages/api/package.json`                           | Remove stale CF/Hono devDeps                       |

---

## Task 1: Delete Dead CF Config Files

**Risk:** Zero — these files are not imported by any code.

**Files:**

- DELETE: `apps/server/wrangler.jsonc`
- DELETE: `apps/server/wrangler.dev.jsonc`
- DELETE: `apps/agent/wrangler.jsonc`
- DELETE: `apps/server/worker-configuration.d.ts`
- DELETE: `apps/web/worker-configuration.d.ts`

- [ ] **Step 1: Delete all 5 files**

```bash
rm apps/server/wrangler.jsonc apps/server/wrangler.dev.jsonc apps/agent/wrangler.jsonc apps/server/worker-configuration.d.ts apps/web/worker-configuration.d.ts
```

- [ ] **Step 2: Verify no imports reference them**

```bash
rg "wrangler\.(jsonc|json)|worker-configuration" packages/ apps/ --include "*.ts" --include "*.json" -g '!node_modules'
```

Expected: 0 matches (except possibly in .gitignore or docs)

- [ ] **Step 3: Commit**

```bash
git add -u
git commit -m "chore: delete dead Cloudflare config and generated type files"
```

---

## Task 2: Clean `@tsu-stack/env` Schema — Remove CF-era Vars

**Files:**

- Modify: `packages/env/src/server/env.ts`
- Modify: `packages/env/src/web/env.server.ts`
- Modify: `packages/env/.env.example`

- [ ] **Step 1: Remove `AGENT_WORKER_URL`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` from server env**

Open `packages/env/src/server/env.ts`. Find and remove these entries:

```typescript
// REMOVE these lines:
AGENT_WORKER_URL: z.url().optional(),
// (and its comment about CF service binding)

TURSO_DATABASE_URL: runtimeRequired(z.string().optional()),
TURSO_AUTH_TOKEN: runtimeRequired(z.string().optional()),
```

Also rename `WORKERS_CI_COMMIT_SHA` to `SOURCE_COMMIT`:

```typescript
// BEFORE:
WORKERS_CI_COMMIT_SHA: z.string().min(1).default("unknown"), // autogenerated by Coolify

// AFTER:
SOURCE_COMMIT: z.string().min(1).default("unknown"),
```

Update the `skipValidation` comment to remove CF reference:

```typescript
// BEFORE:
// Cloudflare's 1s startup limit makes async validation too slow in production.

// AFTER:
// Skip async env validation in production for faster startup.
```

- [ ] **Step 2: Rename `R2_PUBLIC_BASE_URL` in web server env**

Open `packages/env/src/web/env.server.ts`. Find:

```typescript
// BEFORE:
R2_PUBLIC_BASE_URL: process.env.IS_BUILD === "true" ? z.url().default("https://placeholder.r2.dev") : z.url(),

// AFTER:
MEDIA_PUBLIC_URL: process.env.IS_BUILD === "true" ? z.url().default("http://localhost:9000/personal-hub") : z.url(),
```

Also update `SOURCE_COMMIT` if it references `WORKERS_CI_COMMIT_SHA`:

```typescript
// Check if SOURCE_COMMIT reads from WORKERS_CI_COMMIT_SHA:
SOURCE_COMMIT: process.env.WORKERS_CI_COMMIT_SHA;
// If so, change to:
SOURCE_COMMIT: process.env.SOURCE_COMMIT ?? process.env.WORKERS_CI_COMMIT_SHA;
```

- [ ] **Step 3: Clean `.env.example`**

Open `packages/env/.env.example`. Remove:

```
AGENT_WORKER_URL="http://localhost:4111"
TURSO_DATABASE_URL=""
TURSO_AUTH_TOKEN=""
```

Note: `SOURCE_COMMIT` already exists in `.env.example` (line ~82). Don't add a duplicate. Just verify it's there and update the comment if it references `WORKERS_CI_COMMIT_SHA`.

- [ ] **Step 4: Verify build**

```bash
pnpm --filter @tsu-stack/env build 2>&1 | tail -5
```

Expected: exits 0

- [ ] **Step 5: Commit**

```bash
git add packages/env/
git commit -m "chore: remove CF-era env vars (AGENT_WORKER_URL, TURSO_*, WORKERS_CI_COMMIT_SHA)"
```

---

## Task 3: Delete Dead Hono and Agent Code

**Files:**

- DELETE: `packages/api/src/lib/context/hono/create-context.ts`
- DELETE: `packages/api/src/lib/agent/worker.ts`
- DELETE: `packages/logger/src/server/hono/middleware.ts`

- [ ] **Step 1: Verify no live code imports these files**

```bash
rg "create-context|createAgentWorker|AgentWorkerEnv" packages/ apps/ --include "*.ts" -g '!node_modules' -g '!*.d.ts'
```

Expected: only the files being deleted should match (plus possibly `orpc.ts` which we already cleaned)

- [ ] **Step 2: Delete the files**

```bash
rm packages/api/src/lib/context/hono/create-context.ts packages/api/src/lib/agent/worker.ts packages/logger/src/server/hono/middleware.ts
```

- [ ] **Step 3: Check if `packages/logger/package.json` has Hono exports to clean**

```bash
rg "hono" packages/logger/package.json
```

If there's a `"./server/hono/*"` export path, remove it. Also check if `hono` is a dependency — if the only Hono usage was the middleware, remove it:

```bash
rg "hono" packages/logger/src/ --include "*.ts" -g '!node_modules'
```

If no other files import from hono, remove `"hono": "catalog:"` from `packages/logger/package.json` dependencies.

- [ ] **Step 4: Check if `hono` is still needed anywhere**

```bash
rg "from ['\"]hono" packages/ apps/ --include "*.ts" -g '!node_modules' -g '!*.d.ts'
```

If zero matches remain, also remove `hono` from `pnpm-workspace.yaml` catalog (Task 6).

- [ ] **Step 5: Verify build**

```bash
pnpm --filter @tsu-stack/api build 2>&1 | tail -5
pnpm --filter @tsu-stack/logger build 2>&1 | tail -5
```

Expected: both exit 0

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/lib/context/ packages/api/src/lib/agent/ packages/logger/
git commit -m "chore: delete dead Hono context, agent worker proxy, and Hono logger middleware"
```

---

## Task 4: Rewrite R2 Storage → MinIO/S3

**Files:**

- Rewrite: `packages/api/src/lib/storage/index.ts`
- Modify: `packages/api/src/routers/resume.router.ts`
- Modify: `packages/api/src/client/tanstack-start/orpc.ts`

- [ ] **Step 1: Rewrite `packages/api/src/lib/storage/index.ts`**

Replace the R2 adapter with a MinIO-compatible S3 adapter. The `files-sdk` package supports S3 adapters:

```typescript
// BEFORE:
import { r2, type R2Bucket } from "files-sdk/r2";

export function createFiles(binding: R2Bucket) {
  return files({
    adapter: r2({ binding, publicBaseUrl: ENV_WEB_SERVER.R2_PUBLIC_BASE_URL })
  });
}

// AFTER:
import { s3 } from "files-sdk/s3";
import { ENV_SERVER } from "@tsu-stack/env/server/env";

export function createFiles() {
  return files({
    adapter: s3({
      endpoint: ENV_SERVER.MINIO_ENDPOINT ?? "http://localhost:9000",
      bucket: "personal-hub",
      accessKeyId: ENV_SERVER.MINIO_ACCESS_KEY ?? "minioadmin",
      secretAccessKey: ENV_SERVER.MINIO_SECRET_KEY ?? "minioadmin",
      publicBaseUrl: ENV_SERVER.MEDIA_PUBLIC_URL ?? "http://localhost:9000/personal-hub"
    })
  });
}
```

Check if `files-sdk` actually exports `s3`:

```bash
ls packages/api/node_modules/files-sdk/dist/ 2>/dev/null | head -20
rg "export.*s3|export.*S3" packages/api/node_modules/files-sdk/dist/ 2>/dev/null | head -5
```

If `files-sdk` doesn't have an S3 adapter, use the MinIO client directly instead. Check what `files-sdk` exports:

```bash
cat packages/api/node_modules/files-sdk/package.json | grep -A 30 '"exports"'
```

- [ ] **Step 2: Add `MINIO_*` env vars to server env schema**

Add to `packages/env/src/server/env.ts` (after the `OPENAI_API_KEY` line):

```typescript
MINIO_ENDPOINT: z.string().default("localhost"),
MINIO_PORT: z.string().default("9000"),
MINIO_USE_SSL: z.stringbool().default(false),
MINIO_ACCESS_KEY: z.string().default("minioadmin"),
MINIO_SECRET_KEY: z.string().default("minioadmin"),
MEDIA_PUBLIC_URL: z.string().default("http://localhost:9000/personal-hub"),
```

- [ ] **Step 3: Update `resume.router.ts` — replace R2 calls**

The resume router calls `context.mediaBucket.put()` and `context.mediaBucket.delete()`. Since `MediaService.getBucket()` in the NestJS server already provides an OrpcContextMediaBucket-compatible interface, the `context.mediaBucket` should come from the NestJS request context (not `process.env.MEDIA_BUCKET`).

Check how `context.mediaBucket` is currently set in the NestJS server:

```bash
rg "mediaBucket" apps/server/src/ --include "*.ts" -n
```

If it's not set in `RequestContextProvider`, add it there using `MediaService.getBucket()`.

- [ ] **Step 4: Update `orpc.ts` — remove `process.env.MEDIA_BUCKET`**

In `packages/api/src/client/tanstack-start/orpc.ts`, the SSR context sets:

```typescript
mediaBucket: process.env.MEDIA_BUCKET as unknown as OrpcContextMediaBucket,
```

This should be removed or replaced. In the NestJS server, the `RequestContextProvider` sets `mediaBucket` from `MediaService.getBucket()`. The SSR path (which runs in the web app, not NestJS) needs its own MinIO client. Options:

**Option A (simple):** Import `MediaService` from the server and call `getBucket()` in SSR context. But this couples web to server internals.

**Option B (correct):** Create a shared `createMediaBucket()` function in `@tsu-stack/api` that both NestJS and SSR can call. The NestJS server already provides `mediaBucket` via `RequestContextProvider` using `mediaService.getBucket()` (`apps/server/src/common/providers/request-context.provider.ts`), so the SSR path in `orpc.ts` is the only consumer that needs this helper.

The `OrpcContextMediaBucket` interface is defined in `packages/core/src/orpc-context/index.ts:71-79`:

```typescript
export type OrpcContextMediaBucket = {
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | FormData | string,
    options?: { httpMetadata?: { contentType?: string } }
  ): Promise<{ key: string }>;
  get(key: string): Promise<{ body: ReadableStream | null; key: string } | null>;
  delete(key: string): Promise<void>;
};
```

Create `packages/api/src/lib/storage/media-bucket.ts`:

```typescript
import * as Minio from "minio";
import { randomUUID } from "crypto";
import { type OrpcContextMediaBucket } from "@tsu-stack/core";
import { ENV_SERVER } from "@tsu-stack/env/server/env";

let cached: OrpcContextMediaBucket | null = null;

export function createMediaBucket(): OrpcContextMediaBucket {
  if (cached) return cached;

  const client = new Minio.Client({
    endPoint: ENV_SERVER.MINIO_ENDPOINT ?? "localhost",
    port: parseInt(ENV_SERVER.MINIO_PORT ?? "9000"),
    useSSL: ENV_SERVER.MINIO_USE_SSL === "true",
    accessKey: ENV_SERVER.MINIO_ACCESS_KEY ?? "minioadmin",
    secretKey: ENV_SERVER.MINIO_SECRET_KEY ?? "minioadmin"
  });
  const bucket = "personal-hub";

  cached = {
    put: async (key, value, options) => {
      let buffer: Buffer;
      if (typeof value === "string") {
        buffer = Buffer.from(value);
      } else if (value instanceof ArrayBuffer) {
        buffer = Buffer.from(value);
      } else if (value instanceof ReadableStream) {
        const reader = value.getReader();
        const chunks: Uint8Array[] = [];
        let done = false;
        while (!done) {
          const result = await reader.read();
          done = result.done;
          if (result.value) chunks.push(result.value);
        }
        buffer = Buffer.concat(chunks);
      } else {
        throw new Error("FormData not supported in MinIO adapter");
      }
      const contentType = options?.httpMetadata?.contentType ?? "application/octet-stream";
      const objectKey = key || `${randomUUID()}`;
      await client.putObject(bucket, objectKey, buffer, buffer.length, {
        "Content-Type": contentType
      });
      return { key: objectKey };
    },
    get: async (key) => {
      try {
        const obj = await client.getObject(bucket, key);
        return { body: obj as unknown as ReadableStream, key };
      } catch {
        return null;
      }
    },
    delete: async (key) => {
      await client.removeObject(bucket, key);
    }
  };
  return cached;
}
```

Then in `orpc.ts` (same directory as `lib/storage/`, so use relative import):

```typescript
import { createMediaBucket } from "./lib/storage/media-bucket";

// In context builder:
mediaBucket: createMediaBucket(),
```

- [ ] **Step 5: Verify build**

```bash
pnpm --filter @tsu-stack/api build 2>&1 | tail -5
```

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/lib/storage/ packages/api/src/routers/resume.router.ts packages/api/src/client/tanstack-start/orpc.ts packages/env/
git commit -m "feat: replace R2 storage adapter with MinIO/S3"
```

---

## Task 5: Fix Health Router — `WORKERS_CI_COMMIT_SHA`

**Files:**

- Modify: `packages/api/src/routers/health.router.ts`

- [ ] **Step 1: Update the health router**

Find the line referencing `ENV_SERVER.WORKERS_CI_COMMIT_SHA`:

```bash
rg "WORKERS_CI_COMMIT_SHA" packages/api/src/routers/health.router.ts -n
```

Replace with `ENV_SERVER.SOURCE_COMMIT` (renamed in Task 2).

- [ ] **Step 2: Verify build**

```bash
pnpm --filter @tsu-stack/api build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/routers/health.router.ts
git commit -m "chore: update health router to use SOURCE_COMMIT instead of WORKERS_CI_COMMIT_SHA"
```

---

## Task 6: Clean Workspace Config — Remove CF Dependencies

**Files:**

- Modify: `pnpm-workspace.yaml`
- Modify: `apps/server/vite.config.ts`
- Modify: `vite.config.ts` (root)

- [ ] **Step 1: Clean CF deps from catalog, add missing deps**

Open `pnpm-workspace.yaml`. Remove from `catalog:`:

```
"@cloudflare/vite-plugin": ^1.42.4
"@cloudflare/workers-types": 4.20260701.1
wrangler: ^4.106.0
```

Remove from `catalog:` (CF-era Mastra deps):

```
"@mastra/duckdb": "^1.5.1"
"@mastra/libsql": "^1.15.1"
"@mastra/deployer-cloudflare": ^1.2.7
"@mastra/cloudflare-d1": ^1.1.1
"@mastra/hono": ^1.5.6
"@duckdb/node-bindings": 1.5.4-r.1
```

Remove from `minimumReleaseAgeExclude:`:

```
miniflare@4.20260529.0
wrangler@4.96.0
"@mastra/duckdb@1.5.1"
```

Remove `hono` from catalog if Task 3 confirmed it's unused.

Add to `catalog:` (needed by `packages/api` for Task 4):

```
minio: ^8.0.0
```

- [ ] **Step 2: Remove `@cloudflare/vite-plugin` from server vite.config**

```bash
rg "cloudflare" apps/server/vite.config.ts -n
```

If found, remove the import and plugin block.

- [ ] **Step 3: Remove `.wrangler` from root vite.config ignores**

```bash
rg "wrangler" vite.config.ts -n
```

Remove any `.wrangler` entries from the server ignore list.

- [ ] **Step 4: Remove `.wrangler` from `apps/web/.gitignore`**

```bash
rg "wrangler" apps/web/.gitignore -n
```

Remove the `.wrangler` line if present.

- [ ] **Step 5: Remove `@cloudflare/workers-types` from `packages/api/package.json` devDependencies**

```bash
rg "cloudflare" packages/api/package.json -n
```

Remove if found.

- [ ] **Step 5b: Remove `@cloudflare/workers-types` from `packages/api/tsconfig.json` types**

`packages/api/tsconfig.json` line 4 has `"types": ["node", "@cloudflare/workers-types"]`. Remove the `@cloudflare/workers-types` entry so it becomes `"types": ["node"]`.

- [ ] **Step 5c: Add `minio` to `packages/api/package.json` dependencies**

`createMediaBucket()` in Task 4 imports `minio`. Add it to `packages/api/package.json`:

```json
"minio": "catalog:"
```

Ensure `minio` is in the `pnpm-workspace.yaml` catalog. If not, add `"minio": "^8.0.0"` (or latest).

- [ ] **Step 6: Run `pnpm install` to update lockfile**

```bash
pnpm install
```

- [ ] **Step 7: Verify builds**

```bash
pnpm --filter @tsu-stack/server build 2>&1 | tail -5
pnpm --filter @tsu-stack/api build 2>&1 | tail -5
```

- [ ] **Step 8: Commit**

```bash
git add pnpm-workspace.yaml apps/server/vite.config.ts vite.config.ts apps/web/.gitignore packages/api/package.json pnpm-lock.yaml
git commit -m "chore: remove Cloudflare deps from workspace catalog and build configs"
```

---

## Task 7: Update Documentation

**Files:**

- Modify: `.agents/environment-variables.md`

- [ ] **Step 1: Update environment-variables.md**

The file exists at `.agents/environment-variables.md`. It has one CF reference at line 39 about `CLOUDFLARE_INCLUDE_PROCESS_ENV`. Update that line to reflect the self-hosted dev workflow (dotenvx loads `.env`, no CF Worker runtime needed).

Also add new env vars to the doc if there's a vars section:

- `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`
- `MEDIA_PUBLIC_URL`
- `SOURCE_COMMIT` (replaces `WORKERS_CI_COMMIT_SHA`)

- [ ] **Step 2: Commit**

```bash
git add .agents/environment-variables.md
git commit -m "docs: update env vars doc for self-hosted deployment"
```

---

## Task 8: Update All package.json Scripts for Self-Hosted Architecture

**Files:**

- Modify: Root `package.json`
- Modify: `apps/server/package.json`
- Modify: `apps/web/package.json`
- Modify: `apps/agent/package.json`
- Modify: `packages/db/package.json`
- Modify: `packages/api/package.json`

- [ ] **Step 1: Update root `package.json` — add new scripts, remove dead ones**

Add these scripts:

```json
"setup": "pnpm docker:up && pnpm db:migrate && pnpm minio:create",
"minio:create": "bash scripts/create-minio-bucket.sh",
"migrate:neon": "bash scripts/migrate-from-neon.sh",
"agent:build": "pnpm --filter @tsu-stack/agent build && pnpm --filter @tsu-stack/server prebuild",
"contract:build": "pnpm --filter @tsu-stack/api build:contract",
"health": "curl -sf http://localhost:5000/health/ready || exit 1",
"docs": "echo 'NestJS Swagger docs: http://localhost:5000/docs'",
"db:migrate:docker": "pnpm --filter @tsu-stack/db db:migrate:docker"
```

Remove dead script:

```json
// REMOVE:
"cf-typegen": "..."
```

- [ ] **Step 2: Update `apps/server/package.json` — add NestJS scripts**

Add these scripts:

```json
"start:debug": "node --inspect --require ./dist/instrumentation.js dist/main.js",
"lint": "eslint src",
"deploy": "docker build -f Dockerfile -t tsu-stack-server .",
"start:swagger": "ENABLE_OPEN_API_DOCS=true node --require ./dist/instrumentation.js dist/main.js"
```

- [ ] **Step 3: Update `apps/web/package.json` — add explicit build and deploy**

Add these scripts:

```json
"build": "vp build",
"deploy": "docker build -f Dockerfile -t tsu-stack-web ."
```

- [ ] **Step 4: Update `apps/agent/package.json` — add start and copy script**

Add these scripts:

```json
"start": "mastra start",
"copy:to-server": "rm -rf ../server/src/_mastra && cp -r dist/mastra ../server/src/_mastra"
```

- [ ] **Step 5: Update `packages/db/package.json` — add explicit DB convenience scripts**

Add these scripts:

```json
"db:migrate": "pnpm run db migrate",
"db:push": "pnpm run db push",
"db:studio": "pnpm run db studio"
```

- [ ] **Step 6: Clean stale deps from `packages/api/package.json`**

Remove from devDependencies (if still present):

```json
"@cloudflare/workers-types": "catalog:",
"hono": "catalog:"
```

- [ ] **Step 7: Verify root scripts work**

```bash
pnpm run health
```

Expected: either "healthy" response from server or connection refused (server not running)

- [ ] **Step 8: Commit**

```bash
git add package.json apps/server/package.json apps/web/package.json apps/agent/package.json packages/db/package.json packages/api/package.json
git commit -m "chore: update all package.json scripts for self-hosted NestJS architecture

- Root: add setup, minio:create, migrate:neon, agent:build, contract:build, health, docs
- Server: add start:debug, lint, deploy, start:swagger (NestJS Swagger admin)
- Web: add explicit build, deploy
- Agent: add start, copy:to-server
- DB: add db:migrate, db:push, db:studio convenience scripts
- API: remove stale @cloudflare/workers-types and hono devDeps
- Remove dead cf-typegen script"
```

---

## Task 9: Final Verification

- [ ] **Step 1: Grep for any remaining CF references**

```bash
rg "cloudflare|wrangler|CloudflareWorker|DurableObject|D1|KV|WORKERS_CI" packages/ apps/ --include "*.ts" --include "*.json" --include "*.jsonc" -g '!node_modules' -g '!dist' -g '!*.d.ts' -g '!contract.json'
```

Expected: 0 matches

- [ ] **Step 2: Full build verification**

```bash
pnpm --filter @tsu-stack/server build 2>&1 | tail -5
pnpm --filter @tsu-stack/web build 2>&1 | tail -5
```

- [ ] **Step 3: Verify env schema loads**

```bash
node -e "const { ENV_SERVER } = require('./packages/env/dist/server/env.js'); console.log(ENV_SERVER.SOURCE_COMMIT)"
```

Expected: prints "unknown" (default)

---

## Summary

| Task      | Description                             | Risk       | Est. Time    |
| --------- | --------------------------------------- | ---------- | ------------ |
| 1         | Delete dead CF config files (5 files)   | Zero       | 5 min        |
| 2         | Clean env schema — remove CF-era vars   | Low        | 15 min       |
| 3         | Delete dead Hono and agent code         | Low        | 10 min       |
| 4         | Rewrite R2 storage → MinIO/S3           | **Medium** | 30 min       |
| 5         | Fix health router var reference         | Zero       | 5 min        |
| 6         | Clean workspace config — remove CF deps | Low        | 15 min       |
| 7         | Update documentation                    | Zero       | 10 min       |
| 8         | Update all package.json scripts         | Low        | 20 min       |
| 9         | Final verification                      | Zero       | 5 min        |
| **Total** |                                         |            | **~115 min** |
