# Known Pitfalls

This file collects every failure mode that a weak executor might fall
into. Each entry links to the task it covers.

## 1. NestJS decorators need `experimentalDecorators` AND `emitDecoratorMetadata` AND `reflect-metadata` imported at app boot

`Task 3` writes `tsconfig.json` with both `experimentalDecorators` and
`emitDecoratorMetadata` (correct).

`reflect-metadata` has to be either:

- imported as `import "reflect-metadata"` at the very top of `apps/server/src/main.ts`, OR
- installed as a real `package.json` dep that NestJS auto-requires.

The plan's Task 3 in `apps/server/package.json` does not list
`reflect-metadata` in `dependencies`. Add it explicitly. If missing,
DI decorators silently fail at runtime — `app.use(...)` will throw
"reflect-metadata is required".

**Required command**: `pnpm add reflect-metadata --filter @tsu-stack/server`

**Required file change**: `apps/server/src/main.ts` first line
must be `import "reflect-metadata";` BEFORE `import { NestFactory }`.

## 2. `@orpc/nest` `ImplementInterceptor` is global — captures all routes registered under `@Controller()`

A weak executor might write:

```typescript
@Controller("projects")
export class ProjectsController {
  @Get("list") // ← DO NOT DO THIS
  @Implement(appRouter.projects.list)
  list() {
    return appRouter.projects;
  }
}
```

This collides with `@Implement` which already emits `@Get("list")` via
the contract's OpenAPI metadata. Doubled route registration → 500 or 404.

The right pattern is `@Controller()` (no prefix) plus the single
`@Implement(appRouter.projects)` method on the controller:

```typescript
@Controller() // ← no prefix; oRPC decides route paths
export class ProjectsController {
  @Implement(appRouter.projects)
  projects() {
    return appRouter.projects;
  }
}
```

NestJS allows multiple controllers to declare `@Controller()` with no
prefix — they coexist. The router's `ImplementInterceptor` registers
each procedure under its OpenAPI-defined path.

Similarly, **don't add `@All('*')` catch-all controllers**. The
`MastraModule.register` already wires the catch-all internally.

## 3. `ORPCModule.forRoot` has a no-op `interceptors:` placeholder in Task 3

Task 3's `app.module.ts` shows:

```typescript
ORPCModule.forRoot({
  interceptors: [
    // Global error logging for all oRPC handlers
  ]
});
```

The empty array is correctly configured. NestJS-level interceptors
carry cross-cutting concerns (DbScope, Logging, AuthGuard). DO NOT
add `onError`, etc. here unless you're also moving the
`AllExceptionsFilter` semantics inside the oRPC layer. The plan
keeps NestJS-level error handling.

## 4. `Do NOT combine `@All` from MastraModule with controllers that have explicit routes`

`MastraModule.register({ prefix: '/agent' })` internally uses
`@All('*')` to mount oRPC-flavored routes AND all Mastra's
`apiRoutes` at `/agent/api/*`. If you add another
`@Controller('agent')` class, it'll shadow the Mastra routes.

## 5. `apps/agent/src/mastra/index.ts` MUST lose Cloudflare-specific config

The starting state already exists at the path above. A weak executor
will copy anything that looks "required", which it isn't:

**Remove**:

- `import { CloudflareDeployer } from "@mastra/deployer-cloudflare"` and its config
- `import { DuckDBStore } from "@mastra/duckdb"` and its config
- `import { LibSQLStore } from "@mastra/libsql"` and `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` use
- `bundler: { externals: ["@mastra/duckdb", "@duckdb/node-bindings"] }` — only needed in Workers bundling
- `MastraPlatformExporter` (unless `MASTRA_PLATFORM_ACCESS_TOKEN` is set — keep it as optional)
- The `alias` for the DuckDB stub

**Keep / Add**:

- `import { PostgresStore } from "@mastra/pg"`
- A `PostgresStore` instance bound to `DATABASE_URL`
- `import { OtelBridge } from "@mastra/otel-bridge"` and a `serviceName`
- `new SensitiveDataFilter()` to keep tokens out of traces

If the executor leaves the dead imports, TypeScript fails on
`@mastra/libsql`, `@mastra/duckdb`, etc. which Task 15 says to
remove from `package.json`. The executor MUST do `Task 15` and
`Task 11` in the same PR — they are tightly coupled.

## 6. `apps/agent/`'s Dockerfile is gone — agent and server collapse into one container

Per ADR-0018 (collapse), `apps/agent/Dockerfile` no longer exists.
**Task 2 Step 2 must NOT create that file.** When `Task 19` runs
final cleanup, `apps/agent/wrangler.jsonc` is removed but the
`apps/agent/src/mastra/index.ts` source stays (used by the server).

## 7. The repo uses `pnpm` catalogs. Use the existing `"@tsu-stack/*"` packages without re-installing

The existing `pnpm-workspace.yaml` already catalogs
`@tsu-stack/db`, `@tsu-stack/auth`, etc. The plan adds
NestJS/Mastra deps as needed. DO NOT add separate
`better-auth` installs — `@tsu-stack/auth` is the proxy.

## 8. `apps/server/src/modules/agent/` directory is intentionally empty after Task 11

Per ADR-0018 collapse, when Task 11 finishes by registering
`MastraModule` in `app.module.ts`, the
`apps/server/src/modules/agent/` directory has no files in it.
DO NOT create `AgentController` or `AgentService` files — the
Mastra endpoint is mounted directly by `MastraModule` and
controllers that need agents inject `MASTRA` from
`@mastra/nestjs`. An empty-module state is acceptable. To keep
the import path correct, leave one placeholder file —
`apps/server/src/modules/agent/index.ts` exporting `{}` — but
otherwise no files.

## 9. `apps/server/src/modules/agent/` MUST NOT include a NestJS `AgentService` HTTP proxy

The pre-grilling plan used this. It is now invalid. Delete
all references to `AgentService` from any NestJS service
that constructs `fetch(http://localhost:4111/…)`.

## 10. `pnpm db:migrate` doesn't exist; use `pnpm db migrate`

The `package.json` at `packages/db` has:

```json
"db": "pnpm dotenvx run -f ../env/.env -- drizzle-kit",
"db:generate": "pnpm run db generate"
```

So the migration command is:

```bash
pnpm --filter @tsu-stack/db db migrate
```

This runs `drizzle-kit migrate` against `DATABASE_URL`. The plan
must use this exact form. The `dotenvx run` part resolves envs at
runtime — for Docker, envs come from `ENV DATABASE_URL=...`.

In Docker, the entrypoint runs:

```bash
drizzle-kit migrate --config=drizzle.config.ts
```

`drizzle-kit` reads `drizzle.config.ts` → `packages/db/drizzle.config.ts`
→ uses env `DATABASE_URL`. Add a new npm script in `packages/db/package.json`
called `db:migrate:docker` that avoids dotenvx:

```json
"db:migrate:docker": "drizzle-kit migrate"
```

Then `docker-entrypoint.sh` calls it explicitly.

## 11. `instrumentation.ts` MUST preload before any other module loads

For `OtelBridge` to inherit active OTEL spans, the Node SDK has to
start first. Add `apps/server/src/instrumentation.ts`:

```typescript
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

const sdk = new NodeSDK({
  serviceName: process.env.OTEL_SERVICE_NAME ?? "personal-hub-server",
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318/v1/traces"
  }),
  instrumentations: [getNodeAutoInstrumentations()]
});

sdk.start();

process.on("SIGTERM", () => {
  sdk.shutdown().finally(() => process.exit(0));
});
```

Then in the server Dockerfile:

```dockerfile
CMD ["node", "--import", "./dist/instrumentation.js", "--require", "reflect-metadata", "dist/main.js"]
```

Or compile `instrumentation.ts` alongside `main.ts` and prepend:

```dockerfile
CMD ["node", "./dist/instrumentation.js", "./dist/main.js"]
```

And make `instrumentation.js` call `await sdk.start()` then
`await import('./main.js')`. This is documented in Mastra's
`@mastra/otel-bridge/README.md`.

## 12. `@orpc/openapi:` the browser client needs `JsonifiedClient` to survive JSON serialization

The plan's Task 20 uses `RouterClient<AppRouter>` as the return
type of `.client()`. The OpenAPILink connector serializes/deserializes
HTTP, so the client must be `JsonifiedClient<RouterClient<AppRouter>>` — that's `@orpc/contract`'s
post-serialization wrapper. Without it, dates become strings etc. on
the wire and TypeScript complains.

**Use exactly**:

```typescript
.client((): JsonifiedClient<RouterClient<AppRouter>> => {
  // ...
  return createORPCClient(link) as JsonifiedClient<RouterClient<AppRouter>>;
});
```

Import: `import { JsonifiedClient } from "@orpc/contract";`

## 13. The `OpenAPILink` instance needs `(link) as any` because it expects `RouterContract` not the runtime router

`OpenAPILink(contract, options)` is typed with `contract: RouterContract`.
Our `contractJson` is JSON, so:

```typescript
const link = new OpenAPILink(contractJson as unknown as RouterContract<typeof appRouter>, {...});
```

Re-export the `RouterContract` type:

```typescript
import type { RouterContract } from "@orpc/contract";
```

## 14. Don't create `apps/server/src/modules/auth/auth.middleware.ts` Importing `auth.handler()` AND don't reuse Hono body streaming — NestJS intercepts the response

The plan's Task 8 shows the Express middleware that constructs a
`Request` from `req` and forwards `auth.handler(request)`. That
mid-stream call returns `Promise<Response>`. **The interceptor MUST
pump through NestJS's response.** The given code in Task 8 is
correct; do not modify it. But also note `auth.handler()` runs
through `@tsu-stack/auth`'s Better Auth setup, which expects
ENV vars at module-load time. Ensure `BETTER_AUTH_SECRET`,
`BETTER_AUTH_URL` are set before the server starts.

## 15. The `agent` field on `OrpcContext` is unchanged from today's Hono path — do NOT pass it the Mastra instance directly

`apps/server/src/lib/context/hono/create-context.ts:43-44` builds
`agentWorker` via `createAgentWorker(env)`. After collapse, `env.AGENT_WORKER`
is undefined (no CF binding) and `env.AGENT_WORKER_URL` is also undefined —
so `agentWorker` falls back to a stub that throws on `.fetch()`.

In the new `createContext` (renamed to `build-context.ts`), the
`agentWorker` field becomes either:

- **Deleted entirely** if oRPC procedures use `MASTRA` directly via
  NestJS injection (preferred — replaces HTTP proxy with same-process
  call), OR
- **A thin wrapper** that delegates to a Mastra agent.

The plan's contents preserve `agentWorker` and let procedures decide.
Tasks 5 and 11 both call sites must match — `RequestContextProvider`
in `apps/server` builds `agentWorker` lazily by reading
`@Inject(MASTRA)` from a provider factory — see Task 5 foldout for
the canonical pattern.

## 16. `tsconfig.json` for `apps/server` MUST extend the workspace tsconfig

A weak executor will overwrite the existing tsconfig wholesale.
That loses inherited settings like `paths-references`, `references`,
`module: "NodeNext"` ergonomics. Instead, write:

```json
{
  "extends": "@tsu-stack/tsconfig/node",
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

The base tsconfig already has ESM settings we want.

## 17. `apps/server/src/app.module.ts` registers `MastraModule` LAST

`MastraModule.register({ prefix: '/agent' })` ships a catch-all
`@All('*')` controller. If any other module's controller catches
the same path, the first imported wins. Putting it last is
documented oRPC/NestJS idiom; obey it.

## 18. `MastraModule.register({ rateLimitOptions: { enabled: true, defaultLimit: 200, generateLimit: 20, windowMs: 60_000 } })`

Mastra default rate limiting is on by default. Disable it for
local dev (`rateLimitOptions.enabled = false`) or the bottle cap of
20 generate calls per minute will stop you mid-development.

## 19. Local-dev env vars differ from Docker-compose env vars

The `docker-compose.yml` services reference each other by Docker-internal
hostnames (`postgres:5432`, `redis:6379`, `minio:9000`). In LOCAL DEV,
those hostnames resolve to **nothing** — the developer must use
`localhost` or `127.0.0.1`.

Two `.env` files must coexist:

- `apps/server/.env.docker` — used by `docker compose`. References
  `postgres`, `redis`, `minio` as hostnames. Read by the server
  container at startup.
- `apps/server/.env` — used by `pnpm dev` (NestJS outside Docker).
  References `localhost:5432`, `localhost:6379`, `localhost:9000`.

A weak model might source these via `dotenvx` (the existing repo
convention). Explicit guidance:

```bash
# Local dev (services running in Docker; app outside Docker):
pnpm --filter @tsu-stack/server dev
# Reads apps/server/.env which has localhost-based URLs.

# Full Docker stack:
docker compose --env-file .env.production up -d
# Reads .env.docker (or docker-compose env section).
```

The plan's `.env.example` uses `localhost`. The plan's
`docker-compose.yml` uses docker-internal names. Both are correct
in their respective contexts. **A weak model may try to unify them
into one file, which breaks one of the two dev modes.** Don't.

## 20. `DATABASE_URL` URL-encoding for special characters in passwords

A weak model may write the Postgres user/password with characters
that have URL-meaning (e.g., `@`, `:`, `!`, `#`, `?`) without
percent-encoding. Special chars in passwords break Drizzle's
parser.

Pattern: either

1. Use a strong random base64 password (avoiding special chars), or
2. Percent-encode every reserved character (`@` → `%40`,
   `:` → `%3A`, `/` → `%2F`, `#` → `%23`, etc.)

Suggested script for generating a safe password:

```bash
openssl rand -base64 32   # alphanumeric plus /, =, +
# Or fully URL-safe:
openssl rand -hex 32       # pure alphanumeric
```

## 21. Webhook signal broadcast is now YOUR responsibility

The Hono handler in `apps/server/src/app.ts:131` does:

```typescript
if (input.runtime?.signalRelay) {
  // ... call Durable Object to broadcast ...
}
```

After self-hosted migration, `runtime.signalRelay` is `undefined`,
the `if` branch becomes a no-op, and **WebSocket clients never see
the signal** until the 20-second polling fallback kicks in.

The new `@Post('webhooks/github')` NestJS controller (Task 9,
Step 4) **must** look up the signal keys via
`getGitHubWebhookSignalKeys(event, payload)` and call
`GithubService.broadcastSignals(signalKeys)` directly. Otherwise
it's a silent regression.

Test: trigger a webhook from a small known repo; the connected
WebSocket client should receive `github-signals` within 200ms.

A weak executor will NOT notice this — silently deletes the broadcast
hop. Mark this as a checklist item in the Task 9 commit message.

## 22. ENV validation schema still references Cloudflare-era vars

`packages/env/src/server/env.ts` has these (snipped):

```typescript
AGENT_WORKER_URL: z.url().optional(),          // ← unused after collapse
TURSO_DATABASE_URL: runtimeRequired(z.string().optional()),
TURSO_AUTH_TOKEN: runtimeRequired(z.string().optional()),
WORKERS_CI_COMMIT_SHA: z.string().min(1).default("unknown"), // ← Coolify-era
```

After Task 15 (Mastra migration), they all must go. `AGENT_WORKER_URL`
is the most insidious because `createAgentWorker(env)` in the existing
`create-context.ts` reads it. The plan's build-context.ts (renamed):
**must not** import `createAgentWorker` from `@tsu-stack/api`'s
`lib/agent/worker`. Strip that import.

A weak model might update Mastra's `apps/agent/src/mastra/index.ts`
but leave `packages/env/src/server/env.ts` unchanged — leaving
references to dead env vars. The change list:

| Removed from `@tsu-stack/env/server/env` schema         | Why                                    |
| ------------------------------------------------------- | -------------------------------------- |
| `AGENT_WORKER_URL`                                      | Collapse (ADR-0018) — agent in-process |
| `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`               | LibSQL removed (Task 15)               |
| `WORKERS_CI_COMMIT_SHA` (or rename to `GIT_COMMIT_SHA`) | Coolify is gone                        |

Also: the comment that says
`"binding is available. In production, prefer the AGENT_WORKER service"`
must be removed.

## 23. `runtimeRequired` helper is `@tsu-stack/env` specific — preserve on rename

When deleting the above, the `runtimeRequired` helper function is fine.
Continue using `runtimeRequired(z.string().optional())` for any new
optional vars. Keep that helper.

## 24. Add new deps to `pnpm-workspace.yaml` catalog, not raw versions

The repo uses `pnpm.catalog:` references throughout. New packages
must be added to `pnpm-workspace.yaml`'s `catalog:` section first,
then referenced as `"@nestjs/common": "catalog:"` in package.json.

`package.json` `"^11.0.0"` direct versions are anti-pattern here.

After every `pnpm add` for a new top-level dep, update the catalog.

## 25. Browser-log ingestion endpoint `POST /_logs/ingest` must be re-implemented in NestJS

`apps/server/src/app.ts:61` registers the Hono middleware
`honoLogIngestionMiddleware()` from `@tsu-stack/logger`. The
browser (`apps/web/src/router.tsx:22`,
`packages/logger/src/client/index.ts:48`) POSTs batches of
client-side logs there on drain.

After Hono is removed, the endpoint disappears unless we
re-implement it as a NestJS controller. The web app will keep
trying to POST and silently lose logs (no retry on 404).

Add to Task 9 (or extend it):

```typescript
// apps/server/src/modules/log-ingest/log-ingest.controller.ts
@Controller("_logs")
export class LogIngestController {
  constructor(@Inject(LOG_SERVICE) private readonly log: typeof Log) {}

  @Post("ingest")
  @PUBLIC()
  @HttpCode(204)
  async ingest(@Body() batches: DrainContext[]): Promise<void> {
    for (const ctx of Array.isArray(batches) ? batches : []) {
      // Mirror `emitClientLog` from packages/logger/src/server/hono/middleware.ts
      // here. Keep both implementations in sync if logger changes its shape.
    }
  }
}
```

(Same JSON-shape validation: `it must be an Array<DrainContext>
where each DrainContext has `event: Record<string, unknown>`.)

A weak excise will glue these together or fault-trigger the
endpoint removal.

## 26. Browser client uses raw `WebSocket` — Socket.IO migration forces a frontend rewrite

Today, `apps/web/src/shared/lib/use-github-signal-stream.ts:362`
does `ws = new WebSocket(getWebSocketUrl())` against the CF/Hono
endpoint `ws://server:/api/ws/github-signals`. Plan Task 9 introduces
Socket.IO + Redis Adapter for the server side.

For the client to talk to Socket.IO, it **must** use the
`socket.io-client` package. Implementation:

```typescript
// apps/web/src/shared/lib/use-github-signal-stream.ts (new)
import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

function connect(url: string): Socket {
  if (socket?.connected) return socket;
  socket = io(url, {
    path: "/socket.io", // Socket.IO default; @socket.io/redis-adapter doesn't change this
    transports: ["websocket"],
    auth: () => ({
      // session cookie is sent on the same origin automatically
    })
  });
  return socket;
}
```

`@socket.io/redis-adapter` runs entirely server-side; it does NOT
change the wire protocol the client sees. The client just speaks
Socket.IO protocol. So the change is: drop `new WebSocket(url)`,
use `io(url, { transports: ["websocket"] })`.

Add this to Task 9 execution, **not** Task 20. Frontend change is
mandatory and tied to the server-side switch.

Browser install:

```bash
pnpm add socket.io-client --filter @tsu-stack/web
```

Verify: `pnpm --filter @tsu-stack/web typecheck` exits 0. The
existing `use-github-signal-stream` already has a clean event-based
interface; swap the `ws.onmessage` handler for `socket.on('github-signals', ...)`.

## 27. Webhook HMAC verification needs raw bytes, not reserialized JSON

GitHub's HMAC signs the **raw body bytes** that GitHub sent. If you
`JSON.stringify(parsedPayload)`, the resulting string has different
key ordering / whitespace vs the original, and HMACs do NOT match.

`handleGitHubWebhook(input.rawBody, ...)` calls
`verifyGitHubWebhookSignature(input.rawBody, signature256, secret)`.
The rawBody MUST be the exact bytes GitHub sent.

In NestJS:

1. In `main.ts`, before `NestFactory.create`:

```typescript
import { json } from "express";

const app = await NestFactory.create(AppModule, { rawBody: true });
app.use(
  "/webhooks/github",
  json({
    limit: "10mb",
    verify: (req: any, _res, buf) => {
      req.rawBody = buf; // exposes original bytes to controllers
    }
  })
);
```

2. The webhook controller reads `req.rawBody` (Buffer or string)
   instead of `JSON.stringify(payload)`.

A weak model will silently ship `JSON.stringify(payload)` and all
webhook signatures will fail with 401 — but ONLY in production
where the secret is real. Will silently seem to work in tests
where `signature256` is left blank. Delete this risk by using
`req.rawBody` always.

Verify: curl with `X-Hub-Signature-256` set to a forged value gets
401; correctly signed gets 200.
