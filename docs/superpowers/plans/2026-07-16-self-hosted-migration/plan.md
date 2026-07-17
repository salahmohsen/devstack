# Self-Hosted Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate from Cloudflare Workers to self-hosted Dokploy with NestJS + oRPC, PostgreSQL, Redis, MinIO, and multi-tenant support.

**Architecture:** Three Docker containers (web, server, agent) behind Traefik reverse proxy. NestJS server wrapping existing `packages/api` oRPC routers via `@Implement`. PostgreSQL for data, Redis for cache/pubsub, MinIO for object storage.

**Tech Stack:** NestJS, oRPC, PostgreSQL, Redis, MinIO, Docker, Traefik, Better Auth, Mastra

---

## Migration Strategy

### What Stays (packages/api)

The 11 oRPC routers in `packages/api/src/routers/` are **not rewritten**. They remain as-is and are mounted into NestJS controllers via `@Implement` from `@orpc/nest`. This preserves:

- All existing procedure factories (`publicProcedure`, `protectedProcedure`, `ownerProcedure`)
- All existing schemas, mappers, and business logic
- The `appRouter` type for client-side type safety

### What Gets Replaced (apps/server)

| Current (Hono)                            | NestJS Equivalent                                    |
| ----------------------------------------- | ---------------------------------------------------- |
| `app.ts` middleware stack                 | NestJS guards, interceptors, filters                 |
| `worker.ts` CF entry                      | `main.ts` NestJS bootstrap                           |
| `createContext()`                         | Request-scoped `RequestContext` provider             |
| `runWithDb(createDb())`                   | `DbScopeInterceptor` (automatic per-request)         |
| `github-signal-relay.ts` (Durable Object) | `GithubGateway` (Socket.IO via `@nestjs/websockets`) |
| `app.onError()`                           | `AllExceptionsFilter` (global filter)                |
| `honoLoggerMiddleware`                    | `LoggingInterceptor` (global interceptor)            |
| Manual CORS                               | `app.enableCors()` in bootstrap                      |

### What Gets Added

- Better Auth middleware (`/auth/*` passthrough)
- DB scoping interceptor (replaces manual `runWithDb`)
- Request-scoped context provider (replaces `createContext()`)
- WebSocket gateway (replaces Durable Object)
- Health checks with Redis/MinIO/Postgres probes
- Swagger/OpenAPI auto-generation from decorators

---

## File Structure

```
docker-compose.yml                 # Full stack orchestration
docker-compose.prod.yml            # Production overrides with Traefik labels
.env.example                       # All environment variables
scripts/init-databases.sh          # PostgreSQL multi-db init
scripts/migrate-from-neon.sh       # Temporary migration script (DELETE AFTER USE)
scripts/create-minio-bucket.sh     # MinIO bucket setup

apps/agent/
├── Dockerfile
├── package.json                   # Remove wrangler, add @mastra/pg
└── src/mastra/index.ts            # Remove CloudflareDeployer, add PostgresStore

apps/server/
├── Dockerfile
├── package.json                   # NestJS dependencies
├── tsconfig.json                  # ESM + decorators
├── nest-cli.json                  # NestJS CLI config
└── src/
    ├── main.ts                    # Bootstrap (CORS, Swagger, ValidationPipe)
    ├── app.module.ts              # Root module importing all feature modules
    ├── common/
    │   ├── guards/
    │   │   ├── auth.guard.ts      # Checks request.user (set by auth middleware)
    │   │   └── owner.guard.ts     # Checks session user === github_config owner
    │   ├── interceptors/
    │   │   ├── db-scope.interceptor.ts    # Wraps request in runWithDb (CRITICAL)
    │   │   ├── logging.interceptor.ts     # Request timing + structured logging
    │   │   └── cache.interceptor.ts       # Redis response caching
    │   ├── middleware/
    │   │   └── auth.middleware.ts          # Better Auth /auth/* passthrough
    │   ├── decorators/
    │   │   ├── current-user.decorator.ts  # @CurrentUser() param decorator
    │   │   └── public.decorator.ts        # @Public() marks routes as auth-free
    │   ├── providers/
    │   │   └── request-context.provider.ts # Request-scoped OrpcContext
    │   └── filters/
    │       └── all-exceptions.filter.ts   # Global error handler
    ├── modules/
    │   ├── auth/
    │   │   ├── auth.module.ts             # Better Auth middleware registration
    │   │   └── auth.middleware.ts          # Passthrough to auth.handler()
    │   ├── github/
    │   │   ├── github.module.ts
    │   │   ├── github.controller.ts       # @Implement(appRouter.github)
    │   │   ├── github.service.ts          # Broadcasts via gateway
    │   │   └── github.gateway.ts          # WebSocket (replaces Durable Object)
    │   ├── projects/
    │   │   ├── projects.module.ts
    │   │   └── projects.controller.ts     # @Implement(appRouter.projects)
    │   ├── experiences/
    │   │   ├── experiences.module.ts
    │   │   └── experiences.controller.ts  # @Implement(appRouter.experiences)
    │   ├── stacks/
    │   │   ├── stacks.module.ts
    │   │   └── stacks.controller.ts       # @Implement(appRouter.stacks)
    │   ├── portfolio/
    │   │   ├── portfolio.module.ts
    │   │   └── portfolio.controller.ts    # @Implement(appRouter.portfolio)
    │   ├── profile/
    │   │   ├── profile.module.ts
    │   │   └── profile.controller.ts      # @Implement(appRouter.profile)
    │   ├── resume/
    │   │   ├── resume.module.ts
    │   │   └── resume.controller.ts       # @Implement(appRouter.resume)
    │   ├── contact/
    │   │   ├── contact.module.ts
    │   │   └── contact.controller.ts      # @Implement(appRouter.contact)
    │   ├── github-config/
    │   │   ├── github-config.module.ts
    │   │   └── github-config.controller.ts # @Implement(appRouter.githubConfig)
    │   ├── agent/
    │   │   ├── agent.module.ts
    │   │   ├── agent.controller.ts        # @Implement(appRouter.agent)
    │   │   └── agent.service.ts           # HTTP client to Mastra agent
    │   ├── media/
    │   │   ├── media.module.ts
    │   │   └── media.service.ts           # MinIO operations
    │   ├── cache/
    │   │   ├── cache.module.ts            # Global Redis module
    │   │   └── cache.service.ts
    │   └── health/
    │       ├── health.module.ts
    │       └── health.controller.ts       # Liveness + readiness probes
    └── config/
        ├── database.config.ts
        ├── redis.config.ts
        └── minio.config.ts

apps/web/
├── Dockerfile
└── src/server.ts                  # Node.js entry (replaces CF Worker)
```

---

## Task 1: Infrastructure Setup (Docker Compose)

> **Pitfalls:** #19 (dev env vs docker env must remain separate), #20 (URL-encode special chars in passwords).
> **Markers:**
> `@blocker-if`: nothing (this is the foundation).
> `@done-when`: `docker compose ps` shows postgres (healthy), redis (healthy), minio (started). `docker compose down && docker compose up -d` works cleanly twice.
> `@verify`: `docker compose exec postgres psql -U admin -l` lists both `personal_hub` and `mastra_agent` databases after first boot.

**Files:**

- Create: `docker-compose.yml`
- Create: `docker-compose.prod.yml`
- Create: `.env.example`
- Create: `apps/server/Dockerfile` (covered in Task 2)
- Create: `apps/server/scripts/docker-entrypoint.sh` (idempotent migrate + start; referenced by dockerfile CMD in Task 2)
- Create: `scripts/init-databases.sh`

- [ ] **Step 1: Create `.env.example`**

```bash
# PostgreSQL
POSTGRES_USER=admin
POSTGRES_PASSWORD=changeme
POSTGRES_DB=personal_hub

# Redis
REDIS_PASSWORD=changeme

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=changeme

# Server
SERVER_PORT=5000
AGENT_URL=http://agent:4111
WEB_URL=http://web:3000
VITE_SERVER_URL=http://localhost:5000/server
VITE_WEB_URL=http://localhost:3000
BETTER_AUTH_SECRET=changeme
GITHUB_WEBHOOK_SECRET=
ENABLE_OPEN_API_DOCS=true

# Agent
AGENT_DATABASE_URL=postgresql://admin:changeme@postgres:5432/mastra_agent
NODE_ENV=production
```

- [ ] **Step 2: Create `scripts/init-databases.sh`**

```bash
#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE mastra_agent;
    GRANT ALL PRIVILEGES ON DATABASE mastra_agent TO $POSTGRES_USER;
EOSQL
```

- [ ] **Step 3: Create `docker-compose.yml`**

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:17-alpine
    volumes:
      - pg_data:/var/lib/postgresql/data
      - ./scripts/init-databases.sh:/docker-entrypoint-initdb.d/init-databases.sh
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --save 60 1000 --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}

  server:
    build:
      context: .
      dockerfile: apps/server/Dockerfile
    ports:
      - "${SERVER_PORT:-5000}:5000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_started
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      MINIO_ENDPOINT: minio:9000
      MINIO_ACCESS_KEY: ${MINIO_ROOT_USER}
      MINIO_SECRET_KEY: ${MINIO_ROOT_PASSWORD}
      AGENT_URL: http://agent:4111
      WEB_URL: http://web:3000
      VITE_SERVER_URL: ${VITE_SERVER_URL}
      VITE_WEB_URL: ${VITE_WEB_URL}
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET}
      GITHUB_WEBHOOK_SECRET: ${GITHUB_WEBHOOK_SECRET}
      ENABLE_OPEN_API_DOCS: ${ENABLE_OPEN_API_DOCS}
      NODE_ENV: production

  agent:
    build:
      context: .
      dockerfile: apps/agent/Dockerfile
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: ${AGENT_DATABASE_URL}
      NODE_ENV: production

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    ports:
      - "${WEB_PORT:-3000}:3000"
    depends_on:
      - server

volumes:
  pg_data:
  redis_data:
  minio_data:
```

- [ ] **Step 4: Create `docker-compose.prod.yml`**

```yaml
version: "3.8"

services:
  server:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.server.rule=Host(`server.salahmohsen.com`)"
      - "traefik.http.routers.server.entrypoints=websecure"
      - "traefik.http.routers.server.tls.certresolver=letsencrypt"
      - "traefik.http.services.server.loadbalancer.server.port=5000"

  agent:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.agent.rule=Host(`agent.salahmohsen.com`)"
      - "traefik.http.routers.agent.entrypoints=websecure"
      - "traefik.http.routers.agent.tls.certresolver=letsencrypt"
      - "traefik.http.services.agent.loadbalancer.server.port=4111"

  web:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.web.rule=Host(`salahmohsen.com`)"
      - "traefik.http.routers.web.entrypoints=websecure"
      - "traefik.http.routers.web.tls.certresolver=letsencrypt"
      - "traefik.http.services.web.loadbalancer.server.port=3000"
```

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml docker-compose.prod.yml .env.example scripts/init-databases.sh
git commit -m "feat: add Docker Compose infrastructure setup"
```

---

## Task 2: Dockerfiles

> **Foldout:** See Task 11 foldout for the server entrypoint (`--require ./dist/instrumentation.js`).
> **Pitfalls:** Per ADR-0018, `apps/agent/Dockerfile` no longer exists. Step 2 has been removed.
> **Markers**:
> `@done-when`: `docker compose build server web` produces two images (no agent image).
> `@verify`: each image runs `pnpm --filter @<workspace> build` cleanly during build-time.

**Files:**

- Create: `apps/server/Dockerfile`
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
EXPOSE 5000
CMD ["node", "dist/main.js"]
```

- [ ] **Step 2: Create `apps/web/Dockerfile`**

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
COPY --from=builder /app/apps/web/dist ./dist
COPY --from=builder /app/apps/web/node_modules ./node_modules
COPY --from=builder /app/apps/web/package.json ./package.json
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

- [ ] **Step 4: Commit**

```bash
git add apps/server/Dockerfile apps/agent/Dockerfile apps/web/Dockerfile
git commit -m "feat: add Dockerfiles for all apps"
```

---

## Task 3: NestJS Server Setup

> **Foldout:** [`foldouts/task-03-nestjs-bootstrap.md`](./foldouts/task-03-nestjs-bootstrap.md)
> **Pitfalls:** Read [`PITFALLS.md`](./PITFALLS.md) entries #1, #2, #3, #4
> **Markers:**
> `@blocker-if`: packages/server has HM router, cloudflare/sk dependencies, and WebSocket server code you intend to delete.
> `@done-when`: `pnpm --filter @tsu-stack/server build` exits 0 with "Compiled successfully".
> `@verify`: `node --require ./dist/instrumentation.js ./dist/main.js` boots and listens on :5000.

**Files:**

- Modify: `apps/server/package.json`
- Modify: `apps/server/tsconfig.json`
- Create: `apps/server/nest-cli.json`
- Create: `apps/server/src/main.ts`
- Create: `apps/server/src/app.module.ts`

- [ ] **Step 1: Update `apps/server/package.json`**

Remove Hono and wrangler dependencies, add NestJS. Keep existing workspace deps (`@tsu-stack/api`, `@tsu-stack/auth`, etc.):

```json
{
  "name": "@tsu-stack/server",
  "type": "module",
  "main": "src/main.ts",
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start": "node dist/main.js",
    "start:prod": "node dist/main.js"
  },
  "dependencies": {
    "@nestjs/common": "^11.0.0",
    "@nestjs/core": "^11.0.0",
    "@nestjs/platform-express": "^11.0.0",
    "@nestjs/config": "^4.0.0",
    "@nestjs/swagger": "^11.0.0",
    "@nestjs/websockets": "^11.0.0",
    "@nestjs/platform-socket.io": "^11.0.0",
    "@nestjs/schedule": "^5.0.0",
    "@orpc/nest": "latest",
    "@orpc/contract": "catalog:",
    "@orpc/server": "catalog:",
    "@orpc/openapi": "catalog:",
    "@tsu-stack/api": "workspace:*",
    "@tsu-stack/auth": "workspace:*",
    "@tsu-stack/db": "workspace:*",
    "@tsu-stack/env": "workspace:*",
    "@tsu-stack/github": "workspace:*",
    "@tsu-stack/logger": "workspace:*",
    "ioredis": "^5.0.0",
    "minio": "^8.0.0",
    "zod": "catalog:"
  },
  "devDependencies": {
    "@nestjs/cli": "^11.0.0",
    "@nestjs/schematics": "^11.0.0",
    "@tsu-stack/tsconfig": "workspace:*",
    "@types/node": "catalog:",
    "typescript": "catalog:"
  }
}
```

- [ ] **Step 2: Update `apps/server/tsconfig.json`**

```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2022",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create `apps/server/nest-cli.json`**

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
```

- [ ] **Step 4: Create `apps/server/src/main.ts`**

```typescript
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true
    })
  );

  app.enableCors({
    origin: [
      process.env.VITE_WEB_URL || "http://localhost:3000",
      process.env.VITE_SERVER_URL || "http://localhost:5000"
    ],
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
    allowMethods: ["GET", "POST", "OPTIONS"]
  });

  if (process.env.ENABLE_OPEN_API_DOCS === "true") {
    const config = new DocumentBuilder()
      .setTitle("Personal Hub API")
      .setVersion("1.0")
      .addSecurity("authCookie", {
        type: "apiKey",
        in: "cookie",
        name: "better_auth.session_token",
        description: "Session cookie from signing in"
      })
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("docs", app, document);
  }

  const port = process.env.PORT || 5000;
  await app.listen(port);
  console.log(`Server running on http://localhost:${port}`);
}
bootstrap();
```

- [ ] **Step 5: Create `apps/server/src/app.module.ts`**

> **Module-import order is significant. The order below MUST be respected**:
>
> 1. `ConfigModule.forRoot({ isGlobal: true })` — provides ConfigService to all subsequent modules.
> 2. `CacheModule` (Global) — provides Redis client via `CacheService` (used by `@socket.io/redis-adapter` in Task 9 and by Media in Task 12).
> 3. `ORPCModule.forRoot({ interceptors: [] })` — registers `ImplementInterceptor` for `@Implement` controllers (Task 10).
> 4. `AuthModule` — registers `AuthMiddleware` for `/auth/*` (Task 8).
> 5. Other feature modules (`GithubModule`, `ProjectsModule`, `MediaModule`, etc.) — order among these is unconstrained.
> 6. `MastraModule.register(...)` — LAST. Catch-all controller for `/agent/*` MUST register last so it doesn't shadow other controllers' routes.

```typescript
import { Module, Global } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { ORPCModule } from "@orpc/nest";
import { AuthMiddleware } from "./modules/auth/auth.middleware.js";
import { GithubModule } from "./modules/github/github.module.js";
import { ProjectsModule } from "./modules/projects/projects.module.js";
import { ExperiencesModule } from "./modules/experiences/experiences.module.js";
import { StacksModule } from "./modules/stacks/stacks.module.js";
import { PortfolioModule } from "./modules/portfolio/portfolio.module.js";
import { ProfileModule } from "./modules/profile/profile.module.js";
import { ResumeModule } from "./modules/resume/resume.module.js";
import { ContactModule } from "./modules/contact/contact.module.js";
import { GithubConfigModule } from "./modules/github-config/github-config.module.js";
import { AgentModule } from "./modules/agent/agent.module.js";
import { MediaModule } from "./modules/media/media.module.js";
import { CacheModule } from "./modules/cache/cache.module.js";
import { HealthModule } from "./modules/health/health.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ORPCModule.forRoot({
      interceptors: [
        // Global error logging for all oRPC handlers
      ]
    }),
    // Feature modules
    AuthMiddleware,
    CacheModule,
    MediaModule,
    GithubModule,
    ProjectsModule,
    ExperiencesModule,
    StacksModule,
    PortfolioModule,
    ProfileModule,
    ResumeModule,
    ContactModule,
    GithubConfigModule,
    AgentModule,
    HealthModule
  ]
})
export class AppModule {}
```

- [ ] **Step 6: Commit**

```bash
git add apps/server/
git commit -m "feat: initialize NestJS server setup with oRPC integration"
```

---

## Task 4: DB Scoping Interceptor (CRITICAL)

> **Markers:**
> `@blocker-if`: Task 3 (NestJS bootstrap) is committed.
> `@done-when`: `pnpm --filter @tsu-stack/server build` exits 0 AND a request to `GET /projects.list` returns 200 (oRPC procedure calls `getDb()` inside the interceptor's scope).
> `@verify`: hit an oRPC procedure that requires DB — should NOT log "getDb fallback" warning.

This replaces the fragile `runWithDb(createDb())` pattern from the Hono middleware. The interceptor wraps every request in a DB scope so `getDb()` from `@tsu-stack/db` works in all controllers automatically.

**Files:**

- Create: `apps/server/src/common/interceptors/db-scope.interceptor.ts`

- [ ] **Step 1: Create DB Scope Interceptor**

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import { Observable } from "rxjs";
import { createDb, runWithDb } from "@tsu-stack/db";

/**
 * Wraps every HTTP request in a per-request Drizzle DB scope.
 *
 * This replaces the Hono `runWithDb(createDb())` middleware pattern.
 * Without this, `getDb()` in repositories throws because there's no
 * AsyncLocalStorage scope active.
 *
 * Each request gets its own Neon WebSocket pool (required for both
 * CF Workers and self-hosted Node.js — the pool cannot outlive a request).
 */
@Injectable()
export class DbScopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const db = createDb();
    return new Observable((subscriber) => {
      runWithDb(db, async () => {
        try {
          const result = await next.handle().toPromise();
          subscriber.next(result);
          subscriber.complete();
        } catch (error) {
          subscriber.error(error);
        }
      });
    });
  }
}
```

- [ ] **Step 2: Register as Global Interceptor in `app.module.ts`**

Add to `AppModule` providers:

```typescript
import { APP_INTERCEPTOR } from '@nestjs/core';
import { DbScopeInterceptor } from './common/interceptors/db-scope.interceptor.js';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: DbScopeInterceptor,
    },
  ],
})
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/common/interceptors/db-scope.interceptor.ts apps/server/src/app.module.ts
git commit -m "feat: add DB scope interceptor replacing runWithDb middleware"
```

---

## Task 5: Request-Scoped Context Provider

> **Pitfalls:** Read [`PITFALLS.md`](./PITFALLS.md) entry #9.
> **Markers:**
> `@blocker-if`: Task 4 (DbScope) is committed. DOES NOT REQUIRE an HttpAdapterHost ref.
> `@done-when`: a `protectedProcedure` invocation in the running server returns 200 with the session user attached (check via logs).
> `@verify`: a request without the session cookie returns 401 from the AuthGuard's `canActivate`.

Replaces `createContext()` from `packages/api/src/lib/context/hono/create-context.ts`. This provider resolves the Better Auth session, creates Octokit instances, and assembles the `OrpcContext` per request.

**Files:**

- Create: `apps/server/src/common/providers/request-context.provider.ts`

- [ ] **Step 1: Create Request Context Provider**

```typescript
import { Injectable, Scope } from "@nestjs/common";
import { REQUEST } from "@nestjs/core";
import { Request } from "express";
import { auth } from "@tsu-stack/auth/index";
import { createDb, runWithDb, betterAuthAccountRepository } from "@tsu-stack/db";
import { createGitHubOctokit } from "@tsu-stack/github/infrastructure/octokit/client";
import { resolvePublicGitHubSource } from "@tsu-stack/github/shared/public-github-source";
import type { OrpcContext } from "@tsu-stack/api/lib/context/types";
import { AgentService } from "../../modules/agent/agent.service.js";
import { MediaService } from "../../modules/media/media.service.js";

@Injectable({ scope: Scope.REQUEST })
export class RequestContextProvider {
  private context: OrpcContext | null = null;

  constructor(
    private agentService: AgentService,
    private mediaService: MediaService
  ) {}

  async resolve(request: Request): Promise<OrpcContext> {
    if (this.context) return this.context;

    const session = await auth.api.getSession({
      headers: request.headers as any
    });

    const githubSource = await resolvePublicGitHubSource();

    // Resolve OAuth token for private repo access
    const oauthToken = session?.user?.id
      ? await runWithDb(createDb(), () =>
          betterAuthAccountRepository.findGitHubAccessTokenForUser(session.user.id)
        )
      : null;

    type ConfiguredSource = Extract<typeof githubSource, { isConfigured: true }>;
    const privateSource: ConfiguredSource | undefined =
      oauthToken && githubSource.isConfigured
        ? { isConfigured: true, owner: githubSource.owner, token: oauthToken }
        : githubSource.isConfigured
          ? githubSource
          : undefined;

    this.context = {
      github: {
        binding: { executionContext: null, kv: null, signalRelay: null },
        privateOctokit: createGitHubOctokit(privateSource),
        publicOctokit: createGitHubOctokit(githubSource.isConfigured ? githubSource : undefined),
        source: githubSource
      },
      logger: null as any, // Will be set by logging interceptor
      session,
      mediaBucket: this.mediaService.getBucket(),
      agentWorker: this.agentService.getFetcher()
    };

    return this.context;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/common/providers/request-context.provider.ts
git commit -m "feat: add request-scoped context provider replacing createContext()"
```

---

## Task 6: Auth Guard, Owner Guard, Decorators, Filters

> **Markers:**
> `@blocker-if`: Task 5 (RequestContextProvider) is committed.
> `@done-when`: `pnpm --filter @tsu-stack/server build` exits 0 AND an unauthenticated request to an `ownerProcedure` endpoint returns 403.
> `@verify`: an authenticated request with a non-owner session returns 403; owner returns 200.

**Files:**

- Create: `apps/server/src/common/guards/auth.guard.ts`
- Create: `apps/server/src/common/guards/owner.guard.ts`
- Create: `apps/server/src/common/decorators/current-user.decorator.ts`
- Create: `apps/server/src/common/decorators/public.decorator.ts`
- Create: `apps/server/src/common/filters/all-exceptions.filter.ts`
- Create: `apps/server/src/common/interceptors/logging.interceptor.ts`

- [ ] **Step 1: Create Auth Guard**

Maps from `packages/api/src/lib/procedures/factory.ts` `requireAuth` middleware:

```typescript
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RequestContextProvider } from "../providers/request-context.provider.js";

export const IS_PUBLIC_KEY = "isPublic";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private requestContext: RequestContextProvider
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const ctx = await this.requestContext.resolve(request);

    if (!ctx.session?.user) {
      throw new UnauthorizedException("Not authenticated");
    }

    // Attach context to request for controllers
    request.orpcContext = ctx;
    return true;
  }
}
```

- [ ] **Step 2: Create Owner Guard**

Maps from `packages/api/src/lib/procedures/factory.ts` `requireOwner` middleware:

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { githubConfigRepository } from "@tsu-stack/db/repositories";

@Injectable()
export class OwnerGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ctx = request.orpcContext;

    if (!ctx?.session?.user) {
      throw new ForbiddenException("Not authenticated");
    }

    const settings = await githubConfigRepository.findPublicGithubSourceSettings();
    const ownerUserId = settings?.userId ?? null;

    if (!ownerUserId || ctx.session.user.id !== ownerUserId) {
      throw new ForbiddenException("Only the GitHub owner can access this resource");
    }

    return true;
  }
}
```

- [ ] **Step 3: Create `@CurrentUser()` Decorator**

```typescript
import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const CurrentUser = createParamDecorator((data: string, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const user = request.orpcContext?.session?.user;
  return data ? user?.[data] : user;
});
```

- [ ] **Step 4: Create `@Public()` Decorator**

```typescript
import { SetMetadata } from "@nestjs/common";
import { IS_PUBLIC_KEY } from "../guards/auth.guard.js";

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

- [ ] **Step 5: Create Global Exception Filter**

Replaces `app.onError()` from `app.ts`:

```typescript
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common";
import { Response } from "express";
import { parseError } from "@tsu-stack/logger/server";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const parsed = parseError(exception);

    response.status(parsed.status).json({
      message: parsed.message,
      ...(parsed.code ? { code: parsed.code } : {}),
      ...(parsed.why ? { why: parsed.why } : {}),
      ...(parsed.fix ? { fix: parsed.fix } : {}),
      ...(parsed.link ? { link: parsed.link } : {})
    });
  }
}
```

- [ ] **Step 6: Create Logging Interceptor**

Replaces `honoLoggerMiddleware`:

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { log } from "@tsu-stack/logger/server";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const elapsed = Date.now() - now;
          if (!url.includes("/health")) {
            log.info({ event: "http_request", method, url, elapsed });
          }
        },
        error: (error) => {
          const elapsed = Date.now() - now;
          log.error({ event: "http_error", method, url, elapsed, error });
        }
      })
    );
  }
}
```

- [ ] **Step 7: Register Global Guards, Interceptors, Filters in `app.module.ts`**

```typescript
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { AuthGuard } from './common/guards/auth.guard.js';
import { DbScopeInterceptor } from './common/interceptors/db-scope.interceptor.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';

@Module({
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_INTERCEPTOR, useClass: DbScopeInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
```

- [ ] **Step 8: Commit**

```bash
git add apps/server/src/common/
git commit -m "feat: add NestJS guards, interceptors, decorators, filters"
```

---

## Task 7: oRPC Contract-Only Client View (JSON minification)

> **Pitfalls:** Read [`PITFALLS.md`](./PITFALLS.md) entry #6 (catalogs).
> **Markers:**
> `@blocker-if`: `packages/api` exists with `appRouter` exposed from `./routers/index`.
> `@done-when`: `pnpm --filter @tsu-stack/api build:contract` produces `packages/api/contract.json` AND `cat packages/api/contract.json | jq '.projects | keys' | head` lists the projects router procedures.

The browser client needs shape-minified `RouterContract` for `OpenAPILink`. We
use `minifyContractRouter` to serialize `appRouter` (with handlers) into
JSON. The server keeps the full implementation; the client import only the
shape.

**Files:**

- Create: `scripts/build-contract.ts`
- Modify: `packages/api/package.json` (add contract build script)
- Create: `packages/api/contract.json` (gitignored, regenerated by the script)

- [ ] **Step 1: Install `@orpc/contract` and `@orpc/openapi`**

```bash
pnpm add @orpc/contract @orpc/openapi
```

- [ ] **Step 2: Create `scripts/build-contract.ts`**

```typescript
import fs from "node:fs";
import { unlazyRouter } from "@orpc/server";
import { minifyRouterContract } from "@orpc/contract";
import { appRouter } from "../packages/api/src/routers/index";

const contract = await unlazyRouter(appRouter);
const minified = minifyRouterContract(contract);

fs.writeFileSync("./packages/api/contract.json", JSON.stringify(minified));
console.log("Wrote contract.json");
```

- [ ] **Step 3: Add build script to `packages/api/package.json`**

```json
{
  "scripts": {
    "build:contract": "tsx scripts/build-contract.ts",
    "prebuild": "pnpm build:contract"
  }
}
```

- [ ] **Step 4: Add to `.gitignore`**

```
packages/api/contract.json
```

- [ ] **Step 5: Run contract build**

```bash
pnpm --filter @tsu-stack/api build:contract
```

- [ ] **Step 6: Commit**

```bash
git add packages/api/package.json scripts/build-contract.ts .gitignore
git commit -m "feat: add contract.json generation for client"
```

---

## Task 8: Auth Module (Better Auth Passthrough)

> **Pitfalls:** Read [`PITFALLS.md`](./PITFALLS.md) entry #14 (HTTP body streaming).
> **Markers:**
> `@blocker-if`: BETTER_AUTH_SECRET, BETTER_AUTH_URL env vars are set; Task 3 has `reflect-metadata` installed.
> `@done-when`: `curl -X POST http://localhost:5000/auth/sign-in -H 'Content-Type: application/json' -d '{...}'` returns a 200/401 with session-cookie headers.
> `@verify`: protected routes without the cookie return 401; with the cookie return 200.

Better Auth expects raw HTTP requests at `/auth/*`. NestJS middleware passes these through directly.

**Files:**

- Create: `apps/server/src/modules/auth/auth.middleware.ts`
- Create: `apps/server/src/modules/auth/auth.module.ts`

- [ ] **Step 1: Create Auth Middleware**

```typescript
import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { auth } from "@tsu-stack/auth/index";

/**
 * Passes /auth/* requests directly to Better Auth's handler.
 *
 * Better Auth expects raw HTTP requests and manages its own session
 * cookies. We bypass NestJS's request pipeline for these routes.
 *
 * NOTE: This middleware must be registered BEFORE the global AuthGuard
 * and DbScopeInterceptor. The NestJS Middleware module handles ordering.
 */
@Injectable()
export class AuthMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Better Auth needs the full URL with base path
    const baseUrl = process.env.VITE_SERVER_URL || "http://localhost:5000/server";
    const fullPath = new URL(req.originalUrl, baseUrl).toString();

    // Create a new Request with the correct URL for Better Auth
    const authRequest = new Request(fullPath, {
      method: req.method,
      headers: req.headers as any,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : req
    });

    auth
      .handler(authRequest)
      .then((response) => {
        // Forward response headers
        response.headers.forEach((value, key) => {
          res.setHeader(key, value);
        });
        res.status(response.status);

        // Stream body
        if (response.body) {
          const reader = response.body.getReader();
          const pump = async (): Promise<void> => {
            const { done, value } = await reader.read();
            if (done) {
              res.end();
              return;
            }
            res.write(value);
            return pump();
          };
          pump().catch(() => res.end());
        } else {
          res.end();
        }
      })
      .catch(next);
  }
}
```

- [ ] **Step 2: Create Auth Module**

```typescript
import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { AuthMiddleware } from "./auth.middleware.js";

/**
 * Registers Better Auth middleware for /auth/* routes.
 *
 * IMPORTANT: This middleware runs BEFORE the global DbScopeInterceptor
 * and AuthGuard because NestJS middleware executes before interceptors.
 * Better Auth uses its own HTTP Drizzle singleton, not the per-request
 * scoped DB — so it intentionally bypasses the DB scope.
 */
@Module({})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes("auth");
  }
}
```

- [ ] **Step 3: Update `app.module.ts` to import `AuthModule`**

```typescript
import { AuthModule } from './modules/auth/auth.module.js';

@Module({
  imports: [
    AuthModule, // Must be first to register /auth/* middleware early
    // ... other modules
  ],
})
```

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/modules/auth/
git commit -m "feat: add Better Auth middleware passthrough"
```

---

## Task 9: GitHub Module (WebSocket + Controllers)

> **Pitfalls:** Refer to the `@socket.io/redis-adapter` ADR-0021 in [`/docs/adr/0021-socketio-redis-pubsub-broadcast-adapter.md`](../../adr/0021-socketio-redis-pubsub-broadcast-adapter.md).
> **Markers:**
> `@blocker-if`: Redis is running and reachable at REDIS_URL; Task 13 (Cache service with getClient / getSubscriber) is committed.
> `@done-when`: browser connects to `ws://localhost:5000` and emits `subscribe` with keys; `redis-cli -a $REDIS_PASSWORD PUBSUB CHANNELS '*'` shows the broadcast channel active.
> `@verify`: broadcast across two `node` instances hits both connections (manual two-process check).

Replaces the Cloudflare Durable Object `GitHubSignalRelay` with a Socket.IO WebSocket Gateway. Also mounts the existing `appRouter.github` via `@Implement`. **Per ADR-0021 the broadcast goes through Redis pub/sub via `@socket.io/redis-adapter`.**

**Files:**

- New install: `pnpm add @socket.io/redis-adapter --filter @tsu-stack/server`
- Create: `apps/server/src/modules/github/github.gateway.ts`
- Create: `apps/server/src/modules/github/github.service.ts`
- Create: `apps/server/src/modules/github/github.controller.ts`
- Create: `apps/server/src/modules/github/github.webhook.controller.ts` (replaces Hono's `app.post('/webhooks/github', …)` — also calls `GithubService.broadcastSignals(signalKeys)` after success)
- Create: `apps/server/src/modules/github/github.module.ts`

**CRITICAL — Webhook controller must broadcast** (via `GithubService.broadcastSignals`):

The Hono handler (`apps/server/src/app.ts:134`) currently calls
`stub.fetch(...)` through `runtime.signalRelay?.get('global')`.
After migration that path is gone — `runtime.signalRelay` is
`undefined` for self-hosted. Without an explicit broadcast, signals
only land in DB rows and never reach connected WebSocket clients.

The new controller **must** call `broadcastSignals(signalKeys)`
after the `handleGitHubWebhook` call returns to keep live clients
in sync. See Step 4.

- [ ] **Step 1: Create GitHub Gateway (WebSocket)**

- [ ] **Step 1: Install the Redis Socket.IO adapter**

```bash
pnpm add @socket.io/redis-adapter --filter @tsu-stack/server
```

- [ ] **Step 2: Create GitHub Gateway (WebSocket + Redis Adapter)**

Replaces `apps/server/src/github-signal-relay.ts` Durable Object. Cross-instance
broadcast through `@socket.io/redis-adapter` fan-out via the existing
`CacheService` Redis connection (see ADR-0021):

```typescript
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { CacheService } from "../cache/cache.service.js";

type SocketState = { keys: string[] };

@WebSocketGateway({
  cors: {
    origin: [
      process.env.VITE_WEB_URL || "http://localhost:3000",
      process.env.VITE_SERVER_URL || "http://localhost:5000"
    ],
    credentials: true
  }
})
export class GithubGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private clientKeys = new Map<string, Set<string>>();

  constructor(private readonly cacheService: CacheService) {}

  async afterInit() {
    // CacheService exposes the same pub/sub pattern as ioredis.
    // The adapter plugs two clients (pub + sub) into Socket.IO.
    this.server.adapter(
      createAdapter(this.cacheService.getClient(), this.cacheService.getSubscriber())
    );
    console.log("[WS] Socket.IO attached to Redis adapter");
  }

  handleConnection(client: Socket) {
    console.log(`[WS] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.clientKeys.delete(client.id);
    console.log(`[WS] Client disconnected: ${client.id}`);
  }

  @SubscribeMessage("subscribe")
  handleSubscribe(client: Socket, payload: { keys: string[] }) {
    if (payload?.keys && Array.isArray(payload.keys)) {
      this.clientKeys.set(client.id, new Set(payload.keys));
      for (const key of payload.keys) {
        client.join(`signal:${key}`);
      }
    }
  }

  /**
   * Broadcast signals to all locally-connected clients. The
   * @socket.io/redis-adapter forwards the same call across instances
   * automatically — only this server's directly connected clients are
   * enumerated; the adapter handles the rest.
   *
   * Called by GithubService when a webhook or signal is received.
   */
  broadcastSignals(signalKeys: string[]) {
    const signalSet = new Set(signalKeys);

    for (const [clientId, keys] of this.clientKeys) {
      if (keys.size > 0 && [...keys].some((key) => signalSet.has(key))) {
        this.server.to(clientId).emit("github-signals", {
          type: "signals",
          keys: signalKeys
        });
      }
    }
  }

  /**
   * Broadcast webhook payload to all connected clients (locally + cross-instance
   * via the adapter).
   */
  broadcastWebhook(event: string, payload: unknown) {
    this.server.emit("github-webhook", { event, payload });
  }
}
```

- [ ] **Step 2: Create GitHub Service**

```typescript
import { Injectable } from "@nestjs/common";
import { GithubGateway } from "./github.gateway.js";

@Injectable()
export class GithubService {
  constructor(private readonly gateway: GithubGateway) {}

  broadcastSignals(signalKeys: string[]) {
    this.gateway.broadcastSignals(signalKeys);
  }

  broadcastWebhook(event: string, payload: unknown) {
    this.gateway.broadcastWebhook(event, payload);
  }
}
```

- [ ] **Step 3: Create GitHub Controller**

Mounts existing `appRouter.github` via `@Implement`:

```typescript
import { Controller } from "@nestjs/common";
import { Implement } from "@orpc/nest";
import { appRouter } from "@tsu-stack/api/routers/index";
import { Public } from "../../common/decorators/public.decorator.js";

@Controller()
export class GithubController {
  /**
   * Mounts the existing github router from packages/api.
   * @Implement generates NestJS routes from the oRPC router's
   * OpenAPI metadata and routes HTTP calls through the @ImplementInterceptor.
   * The handler returns the same router back; the dispatcher already has
   * the .handler() attached inside it.
   */
  @Implement(appRouter.github)
  @Public() // GitHub endpoints are public
  github() {
    return appRouter.github;
  }
}
```

- [ ] **Step 4: Create GitHub Module**

```typescript
import { Module } from "@nestjs/common";
import { GithubController } from "./github.controller.js";
import { GithubWebhookController } from "./github.webhook.controller.js";
import { GithubService } from "./github.service.js";
import { GithubGateway } from "./github.gateway.js";

@Module({
  controllers: [GithubController, GithubWebhookController],
  providers: [GithubService, GithubGateway],
  exports: [GithubService]
})
export class GithubModule {}
```

- [ ] **Step 4: Create the GitHub Webhook controller** (replaces Hono's `app.post('/webhooks/github', …)`)

This controller's primary purpose is to receive GitHub webhooks, call
`handleGitHubWebhook(...)` (already in `@tsu-stack/github`), and BROADCAST
the resulting signal keys to live WebSocket clients via `GithubService`.

The broadcast call replaces the old `runtime.signalRelay.get('global').fetch(...)` indirection that ran in the Hono handler — see PITFALLS section #21.

```typescript
// apps/server/src/modules/github/github.webhook.controller.ts
import { Body, Controller, Headers, HttpCode, Logger, Post, Req } from "@nestjs/common";
import { type Request } from "express";
import { handleGitHubWebhook } from "@tsu-stack/github";

import { PUBLIC } from "../../common/decorators/public.decorator.js";
import { GithubService } from "./github.service.js";
import {
  getGitHubWebhookNamespaceKeys,
  getGitHubWebhookSignalKeys
} from "@tsu-stack/github/infrastructure/cache/github-cache";

@Controller("webhooks")
export class GithubWebhookController {
  private readonly logger = new Logger(GithubWebhookController.name);

  constructor(private readonly githubService: GithubService) {}

  @Post("github")
  @PUBLIC()
  @HttpCode(200)
  async handle(
    @Req() req: Request,
    @Headers("x-github-delivery") deliveryId: string,
    @Headers("x-github-event") event: string,
    @Headers("x-hub-signature-256") signature256: string,
    @Body() payload: unknown
  ): Promise<{ ok: true }> {
    if (!deliveryId || !event) {
      throw new Error("Missing GitHub webhook delivery-id or event header");
    }
    if (!process.env.GITHUB_WEBHOOK_SECRET) {
      throw new Error("GITHUB_WEBHOOK_SECRET not set");
    }

    // We use the raw body via express's `verify` for HMAC verification.
    // Install app.use(express.json({ verify: ... })) in main.ts separately
    // (see Task 3 main.ts addendum).

    const rawBody =
      typeof (req as any).rawBody === "string"
        ? ((req as any).rawBody as string)
        : Buffer.isBuffer((req as any).rawBody)
          ? ((req as any).rawBody as Buffer).toString("utf8")
          : JSON.stringify(payload);

    const result = await handleGitHubWebhook({
      deliveryId,
      event,
      payload,
      rawBody, // ← MUST be original raw bytes for HMAC verification (NOT reserialized JSON)
      runtime: undefined, // ← self-hosted has no DO/KV bindings
      signature256: signature256 ?? null,
      webhookSecret: process.env.GITHUB_WEBHOOK_SECRET!
    });

    // BROADCAST to live WebSocket clients — subnet replacement for the
    // old Cloudflare Durable Object broadcast (see ADR-0021).
    const signalKeys = getGitHubWebhookSignalKeys(event, payload);
    if (signalKeys.length > 0) {
      this.githubService.broadcastSignals(signalKeys);
    }
    const namespaceKeys = getGitHubWebhookNamespaceKeys(event, payload);
    if (namespaceKeys.length > 0) {
      this.githubService.broadcastWebhook(event, payload);
    }

    this.logger.log(`webhook ${event} (delivery ${deliveryId}) -> status ${result.status}`);

    return { ok: true };
  }
}
```

> **Sub-task** (in Task 3 main.ts): enable raw-body capture so signature verification still works:

```typescript
// apps/server/src/main.ts — add BEFORE NestFactory.create(...)
import bodyParser from "body-parser";

const app = await NestFactory.create(AppModule, {
  rawBody: true // ← NestJS sends req.rawBody to controllers
});
app.use(
  "/webhooks/github",
  bodyParser.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf; // HMAC verification reads the raw bytes
    }
  })
);
```

> **Markers:**
> `@done-when`: a curl POSTing a forged GitHub webhook payload to `/webhooks/github` with valid `X-Hub-Signature-256` returns 200 and calls `broadcastSignals`.
> `@verify`: a curl WITHOUT a signature returns 400.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/modules/github/
git commit -m "feat: add GitHub module with WebSocket gateway + webhook controller"
```

---

## Task 10: Feature Controllers (Mount Existing Routers)

> **Pitfalls:** Read [`PITFALLS.md`](./PITFALLS.md) entry #2 (no NestJS HTTP decorators beside `@Implement`).
> **Markers:**
> `@blocker-if`: Tasks 3, 4, 5, 6 (guards + interceptors + context) and Task 11 (`MASTRA` provider) committed.
> `@done-when`: `pnpm --filter @tsu-stack/server build` exits 0 AND each controller's procedures return 200 in `curl`.
> `@verify`: a `protectedProcedure` returns 200 with a valid session cookie and 401 without.

Each controller uses `@Implement(appRouter.xxx)` to mount the existing oRPC routers from `packages/api`. No business logic changes — just wiring. DO NOT add `@Get`/`@Post` decorators beside `@Implement`.

**Files:**

- Create: `apps/server/src/modules/projects/projects.module.ts`
- Create: `apps/server/src/modules/projects/projects.controller.ts`
- Create: `apps/server/src/modules/experiences/experiences.module.ts`
- Create: `apps/server/src/modules/experiences/experiences.controller.ts`
- Create: `apps/server/src/modules/stacks/stacks.module.ts`
- Create: `apps/server/src/modules/stacks/stacks.controller.ts`
- Create: `apps/server/src/modules/portfolio/portfolio.module.ts`
- Create: `apps/server/src/modules/portfolio/portfolio.controller.ts`
- Create: `apps/server/src/modules/profile/profile.module.ts`
- Create: `apps/server/src/modules/profile/profile.controller.ts`
- Create: `apps/server/src/modules/resume/resume.module.ts`
- Create: `apps/server/src/modules/resume/resume.controller.ts`
- Create: `apps/server/src/modules/contact/contact.module.ts`
- Create: `apps/server/src/modules/contact/contact.controller.ts`
- Create: `apps/server/src/modules/github-config/github-config.module.ts`
- Create: `apps/server/src/modules/github-config/github-config.controller.ts`

- [ ] **Step 1: Create Projects Controller + Module**

```typescript
// projects.controller.ts
import { Controller } from "@nestjs/common";
import { Implement } from "@orpc/nest";
import { appRouter } from "@tsu-stack/api/routers/index";

@Controller()
export class ProjectsController {
  @Implement(appRouter.projects)
  projects() {
    return appRouter.projects;
  }
}
```

```typescript
// projects.module.ts
import { Module } from "@nestjs/common";
import { ProjectsController } from "./projects.controller.js";

@Module({ controllers: [ProjectsController] })
export class ProjectsModule {}
```

- [ ] **Step 2: Create remaining controllers (same pattern)**

Each follows the same pattern:

| Controller               | Router                   | Auth                               |
| ------------------------ | ------------------------ | ---------------------------------- |
| `ExperiencesController`  | `appRouter.experiences`  | Protected (auto from guard)        |
| `StacksController`       | `appRouter.stacks`       | Mix (public read, protected write) |
| `PortfolioController`    | `appRouter.portfolio`    | Public                             |
| `ProfileController`      | `appRouter.profile`      | Mix                                |
| `ResumeController`       | `appRouter.resume`       | Protected                          |
| `ContactController`      | `appRouter.contact`      | Protected                          |
| `GithubConfigController` | `appRouter.githubConfig` | Owner-only                         |

Example for Stacks (mix of public/protected):

```typescript
@Controller()
export class StacksController {
  @Implement(appRouter.stacks)
  stacks() {
    return appRouter.stacks;
  }
}
```

- [ ] **Step 3: Create all module files**

Each module simply declares its controller:

```typescript
@Module({ controllers: [XxxController] })
export class XxxModule {}
```

- [ ] **Step 4: Update `app.module.ts` to import all feature modules**

```typescript
@Module({
  imports: [
    AuthModule,
    CacheModule,
    MediaModule,
    GithubModule,
    ProjectsModule,
    ExperiencesModule,
    StacksModule,
    PortfolioModule,
    ProfileModule,
    ResumeModule,
    ContactModule,
    GithubConfigModule,
    AgentModule,
    HealthModule,
  ],
})
```

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/modules/projects/ apps/server/src/modules/experiences/ apps/server/src/modules/stacks/ apps/server/src/modules/portfolio/ apps/server/src/modules/profile/ apps/server/src/modules/resume/ apps/server/src/modules/contact/ apps/server/src/modules/github-config/
git commit -m "feat: add feature controllers mounting existing oRPC routers"
```

---

## Task 11: Agent Module — Mastra Integration via `@mastra/nestjs`

> **Foldout:** [`foldouts/task-11-mastra-module.md`](./foldouts/task-11-mastra-module.md)
> **Pitfalls:** Read [`PITFALLS.md`](./PITFALLS.md) entries #5, #9, #11, #17.
> **Markers:**
> `@blocker-if`: Task 3 (NestJS bootstrap) and Task 11 (MastraModule) MUST land in the same PR. Cloudflare packages removed.
> `@done-when`: `pnpm --filter @tsu-stack/server build` exits 0 AND `node --require ./dist/instrumentation.js ./dist/main.js` boots with "personal-hub-mastra" service in OTel SDK output.
> `@verify`: `curl -s http://localhost:5000/agent/api/agents | jq '. | length'` returns at least 2 (weatherAgent, stackCategorizerAgent).

`apps/agent/src/mastra/index.ts` is registered as a NestJS module via
`MastraModule.register({ mastra, prefix: '/agent' })`. This exposes every
agent/workflow/tool/MCP endpoint under `/agent/*` AND lets our controllers
inject the `mastra` instance directly via `@Inject(MASTRA)`. **No HTTP
proxy. No AgentService.** (See ADR-0018.)

**Files:**

- Modify: `apps/agent/src/mastra/index.ts`
- Modify: `apps/server/src/app.module.ts` (add `MastraModule.register` LAST)
- Modify: `apps/server/src/instrumentation.ts` (NodeSDK + OtelExporter)
- Modify: `apps/server/src/main.ts` (add `import "reflect-metadata"` first line)

**If only the OpenAPI-mounted routes are needed** (the common case), this
task is just the `MastraModule.register` call in `app.module.ts`. No
custom controller class is required. The `apps/server/src/modules/agent/`
directory can be empty.

- [ ] **Step 1: Install `@mastra/nestjs`**

```bash
pnpm add @mastra/nestjs --filter @tsu-stack/server
```

- [ ] **Step 2: Update `app.module.ts`**

Replace the `import { ORPCModule } from '@orpc/nest'` reference with the
actual integration. Both `@orpc/nest` (`ORPCModule.forRoot`) and
`@mastra/nestjs` (`MastraModule.register`) need to be imported —
ORPCModule first, MastraModule last (catch-all controller).

```typescript
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { MastraModule } from "@mastra/nestjs";
import { ORPCModule } from "@orpc/nest";

import { mastra } from "../../agent/src/mastra/index.js";
// ... other imports

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ORPCModule.forRoot({
      /* per-task-3 config */
    }),
    AuthModule, // applies auth middleware
    CacheModule,
    MediaModule,
    GithubModule,
    ProjectsModule,
    ExperiencesModule,
    StacksModule,
    PortfolioModule,
    ProfileModule,
    ResumeModule,
    ContactModule,
    GithubConfigModule,
    HealthModule,
    MastraModule.register({
      // ← LAST (catch-all @All)
      mastra,
      prefix: "/agent",
      rateLimitOptions: { enabled: true, defaultLimit: 200, generateLimit: 20, windowMs: 60_000 },
      shutdownOptions: { timeoutMs: 30_000, notifyClients: true },
      streamOptions: { redact: true, heartbeatMs: 20_000 }
    })
  ]
})
export class AppModule {}
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/app.module.ts apps/server/package.json
git commit -m "feat: register MastraModule in NestJS app"
```

---

## Task 12: Media Module (MinIO)

Replaces Cloudflare R2 with MinIO. The existing `packages/api` uses `context.mediaBucket` — the `MediaService` provides a compatible interface.

**Files:**

- Create: `apps/server/src/modules/media/media.service.ts`
- Create: `apps/server/src/modules/media/media.module.ts`

- [ ] **Step 1: Create Media Service**

```typescript
import { Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as Minio from "minio";
import { randomUUID } from "crypto";

@Injectable()
export class MediaService implements OnModuleInit {
  private minioClient: Minio.Client;
  private bucketName = "personal-hub";

  constructor(private configService: ConfigService) {
    this.minioClient = new Minio.Client({
      endPoint: this.configService.get("MINIO_ENDPOINT", "localhost"),
      port: parseInt(this.configService.get("MINIO_PORT", "9000")),
      useSSL: this.configService.get("MINIO_USE_SSL", "false") === "true",
      accessKey: this.configService.get("MINIO_ACCESS_KEY", "minioadmin"),
      secretKey: this.configService.get("MINIO_SECRET_KEY", "minioadmin")
    });
  }

  async onModuleInit() {
    // Ensure bucket exists
    const exists = await this.minioClient.bucketExists(this.bucketName);
    if (!exists) {
      await this.minioClient.makeBucket(this.bucketName);
      // Set public read policy
      const policy = {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { AWS: ["*"] },
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${this.bucketName}/*`]
          }
        ]
      };
      await this.minioClient.setBucketPolicy(this.bucketName, JSON.stringify(policy));
    }
  }

  /**
   * Returns a bucket-compatible interface matching the existing
   * OrpcContextMediaBucket type from @tsu-stack/core.
   */
  getBucket() {
    return {
      put: async (key: string, body: any, options?: any) => {
        const buffer = Buffer.isBuffer(body) ? body : Buffer.from(await body.arrayBuffer());
        await this.minioClient.putObject(this.bucketName, key, buffer, buffer.length, {
          "Content-Type": options?.httpMetadata?.contentType || "application/octet-stream"
        });
      },
      get: async (key: string) => {
        const obj = await this.minioClient.getObject(this.bucketName, key);
        return obj;
      },
      delete: async (key: string) => {
        await this.minioClient.removeObject(this.bucketName, key);
      }
    };
  }

  async upload(filename: string, contentType: string, data: Buffer) {
    const key = `${randomUUID()}-${filename}`;
    await this.minioClient.putObject(this.bucketName, key, data, data.length, {
      "Content-Type": contentType
    });
    return {
      key,
      url: `${this.configService.get("MINIO_ENDPOINT", "localhost")}/${this.bucketName}/${key}`
    };
  }

  async getPresignedUrl(filename: string, contentType: string) {
    const key = `${randomUUID()}-${filename}`;
    const uploadUrl = await this.minioClient.presignedPutObject(this.bucketName, key, 24 * 60 * 60);
    return { uploadUrl, key };
  }
}
```

- [ ] **Step 2: Create Media Module**

```typescript
import { Module } from "@nestjs/common";
import { MediaService } from "./media.service.js";

@Module({
  providers: [MediaService],
  exports: [MediaService]
})
export class MediaModule {}
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/modules/media/
git commit -m "feat: add Media module with MinIO replacing R2"
```

---

## Task 13: Cache Module (Redis)

> **Pitfalls:** ADRs `0021` requires `getClient()` and `getSubscriber()` accessors.
> **Markers:**
> `@blocker-if`: Redis container up, REDIS_URL set; Task 9 (WebSocket gateway) is still pending, so this task MUST land first.
> `@done-when`: `node -e "await fetch('http://localhost:5000/health/ready')"` returns Redis check "healthy".
> `@verify`: with Redis down, `pnpm sh` etc. recover redis; cache service retries without crashing.

Global Redis module for caching and pub/sub. Replaces Cloudflare KV. The accessor methods `getClient()` and `getSubscriber()` are needed by `@socket.io/redis-adapter` (Task 9).

**Files:**

- Create: `apps/server/src/modules/cache/cache.service.ts`
- Create: `apps/server/src/modules/cache/cache.module.ts`

- [ ] **Step 1: Create Cache Service**

```typescript
import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class CacheService implements OnModuleDestroy {
  private redis: Redis;
  private subscriber: Redis;

  constructor(private configService: ConfigService) {
    const url = this.configService.get("REDIS_URL", "redis://localhost:6379");
    this.redis = new Redis(url);
    this.subscriber = this.redis.duplicate();
  }

  async onModuleDestroy() {
    await this.redis.quit();
    await this.subscriber.quit();
  }

  /**
   * Exposes the underlying ioredis client for callers that need direct
   * access (e.g. `@socket.io/redis-adapter`). Keep these as accessor
   * methods rather than letting callers grab the field directly so the
   * CacheService's connection lifecycle stays intact.
   */
  getClient(): Redis {
    return this.redis;
  }

  getSubscriber(): Redis {
    return this.subscriber;
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.redis.setex(key, ttlSeconds, value);
    } else {
      await this.redis.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async publish(channel: string, message: string): Promise<void> {
    await this.redis.publish(channel, message);
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    await this.subscriber.subscribe(channel);
    this.subscriber.on("message", (_, message) => callback(message));
  }
}
```

- [ ] **Step 2: Create Cache Module (Global)**

```typescript
import { Module, Global } from "@nestjs/common";
import { CacheService } from "./cache.service.js";

@Global()
@Module({
  providers: [CacheService],
  exports: [CacheService]
})
export class CacheModule {}
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/modules/cache/
git commit -m "feat: add Cache module with Redis replacing KV"
```

---

## Task 14: Health Module

Liveness and readiness probes with service checks (Postgres, Redis, MinIO). Replaces the existing `healthRouter` from `packages/api`.

**Files:**

- Create: `apps/server/src/modules/health/health.controller.ts`
- Create: `apps/server/src/modules/health/health.module.ts`

- [ ] **Step 1: Create Health Controller**

```typescript
import { Controller, Get } from "@nestjs/common";
import { Public } from "../../common/decorators/public.decorator.js";
import { CacheService } from "../cache/cache.service.js";
import { MediaService } from "../media/media.service.js";

@Controller("health")
export class HealthController {
  constructor(
    private cacheService: CacheService,
    private mediaService: MediaService
  ) {}

  @Get()
  @Public()
  check() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  }

  @Get("live")
  @Public()
  live() {
    return {
      status: "healthy",
      timestamp: new Date().toISOString()
    };
  }

  @Get("ready")
  @Public()
  async ready() {
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
      await this.cacheService.get("__healthcheck");
      checks.redis = { status: "healthy", latencyMs: Math.round(performance.now() - redisStart) };
    } catch {
      checks.redis = { status: "unhealthy", latencyMs: Math.round(performance.now() - redisStart) };
    }

    const allHealthy = Object.values(checks).every((c) => c.status === "healthy");

    return {
      status: allHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      checks
    };
  }
}
```

- [ ] **Step 2: Create Health Module**

```typescript
import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller.js";

@Module({
  controllers: [HealthController]
})
export class HealthModule {}
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/modules/health/
git commit -m "feat: add Health module with liveness and readiness probes"
```

---

## Task 15: Agent Migration (Mastra)

> **Pitfalls:** Read [`PITFALLS.md`](./PITFALLS.md) entry #5 (Cloudflare cleanup) and entry #11 (`instrumentation.ts`).
> **ADR-0020**: this is where OtelBridge is added.
> **Markers:**
> `@blocker-if`: Task 11 (MastraModule) is in the same PR.
> `@done-when`: `pnpm --filter @tsu-stack/server build` exits 0 AND no leftover imports of @mastra/deployer-cloudflare, @mastra/duckdb, @mastra/libsql, or @duckdb/node-bindings.
> `@verify`: `grep -r "CloudflareDeployer\|DuckDBStore\|LibSQLStore" apps/agent/src/` returns 0 matches.

Remove Cloudflare dependencies, add PostgreSQL storage.

**Files:**

- Modify: `apps/agent/src/mastra/index.ts`
- Modify: `apps/agent/package.json`
- Delete: `apps/agent/wrangler.jsonc`

- [ ] **Step 1: Update `apps/agent/package.json`**

Remove: `@mastra/deployer-cloudflare`, `@mastra/cloudflare-d1`, `@mastra/duckdb`, `@duckdb/node-bindings`, `@mastra/libsql`, `wrangler`, `cross-env`, `@dotenvx/dotenvx`

Add: `@mastra/pg` (already present)

```json
{
  "scripts": {
    "dev": "mastra dev",
    "build": "mastra build",
    "start": "mastra start"
  },
  "dependencies": {
    "@mastra/ai-sdk": "catalog:",
    "@mastra/core": "catalog:",
    "@mastra/pg": "catalog:",
    "@mastra/loggers": "catalog:",
    "@mastra/memory": "catalog:",
    "@mastra/observability": "catalog:",
    "@tsu-stack/core": "workspace:*",
    "@tsu-stack/db": "workspace:*",
    "@tsu-stack/env": "workspace:*",
    "drizzle-orm": "catalog:",
    "ollama-ai-provider-v2": "catalog:",
    "pg": "catalog:",
    "zod": "catalog:"
  },
  "devDependencies": {
    "@tsu-stack/tsconfig": "workspace:*",
    "@types/node": "catalog:",
    "mastra": "catalog:",
    "typescript": "catalog:"
  }
}
```

- [ ] **Step 2: Update `apps/agent/src/mastra/index.ts`**

Remove `CloudflareDeployer`, add `PostgresStore`:

```typescript
import { Mastra } from "@mastra/core/mastra";
import { PostgresStore } from "@mastra/pg";
import { PinoLogger } from "@mastra/loggers";

// ... keep existing agent, workflow, tool imports ...

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

- [ ] **Step 3: Remove wrangler.jsonc**

```bash
rm apps/agent/wrangler.jsonc
```

- [ ] **Step 4: Commit**

```bash
git add apps/agent/
git commit -m "feat: migrate agent from Cloudflare to PostgreSQL"
```

---

## Task 16: Web Migration

Remove CF Worker entry, use Node.js HTTP server.

**Files:**

- Modify: `apps/web/src/server.ts`
- Delete: `apps/web/wrangler.jsonc`

- [ ] **Step 1: Update `apps/web/src/server.ts`**

Remove Cloudflare Worker entry. TanStack Start with Vite Plus already supports Node.js — use its built-in server:

```typescript
// TanStack Start's Vite Plus plugin handles Node.js server automatically.
// The entry point depends on the TanStack Start version.
// Check packages/web/node_modules/@tanstack/start for the correct export.
// For now, the build output in dist/ should produce a runnable Node.js server.
```

- [ ] **Step 2: Remove wrangler.jsonc**

```bash
rm apps/web/wrangler.jsonc
```

- [ ] **Step 3: Remove CF-specific dependencies from `apps/web/package.json`**

Remove: `@cloudflare/vite-plugin`, `wrangler`, `cross-env`

- [ ] **Step 4: Commit**

```bash
git add apps/web/
git commit -m "feat: migrate web from Cloudflare to Node.js"
```

---

## Task 17: Data Migration (Temporary)

> **Foldout:** [`foldouts/task-17-data-migration.md`](./foldouts/task-17-data-migration.md)
> **Pitfalls:** Read [`PITFALLS.md`](./PITFALLS.md) entry #10 (the `db migrate` command).
> **Markers:**
> `@blocker-if`: Production Postgres version is 17 locally vs Neon's server version. Verify pg_isready connectivity before running.
> `@done-when`: `SELECT count(*) FROM portfolio_entry` returns > 0 in the local DB AND matches Neon within reasonable delta.
> `@verify`: `SELECT id, email, name FROM "user"` returns at least 1 row (the owner).

**Files:**

- Create: `scripts/migrate-from-neon.sh`
- Create: `scripts/postgres/wait-healthy.sh`

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

## Task 18: MinIO Bucket Setup

**Files:**

- Create: `scripts/create-minio-bucket.sh`

- [ ] **Step 1: Create bucket script**

```bash
#!/bin/bash
# Create MinIO bucket for media storage

set -e

MINIO_ENDPOINT="http://localhost:9000"
MINIO_USER="${MINIO_ROOT_USER:-minioadmin}"
MINIO_PASS="${MINIO_ROOT_PASSWORD:-minioadmin}"
BUCKET_NAME="personal-hub"

# Install mc if not present
if ! command -v mc &> /dev/null; then
  echo "Installing MinIO client..."
  brew install minio/stable/mc
fi

# Configure alias
mc alias set local $MINIO_ENDPOINT $MINIO_USER $MINIO_PASS

# Create bucket
mc mb local/$BUCKET_NAME --ignore-existing

# Set public read policy
mc anonymous set download local/$BUCKET_NAME

echo "Bucket '$BUCKET_NAME' created successfully"
```

- [ ] **Step 2: Commit**

```bash
git add scripts/create-minio-bucket.sh
git commit -m "feat: add MinIO bucket setup script"
```

---

## Task 19: Final Cleanup

> **Pitfalls:** Per ADR-0018, `apps/agent/Dockerfile` is GONE; only `apps/server/Dockerfile` and `apps/web/Dockerfile` survive.
> **Markers:**
> `@done-when`: `pnpm --filter @tsu-stack/server build` exits 0 AND `git status` shows only the expected deletions.
> `@verify`: `git grep "hono\|wrangler\|CloudflareDeployer\|DurableObject" -- ':!*.md'` returns 0 matches.

- [ ] **Step 1: Delete temporary migration script**

```bash
rm scripts/migrate-from-neon.sh
git add -u
git commit -m "chore: remove temporary migration script"
```

- [ ] **Step 2: Delete old Hono files from `apps/server/src/`**

```bash
rm apps/server/src/app.ts apps/server/src/worker.ts apps/server/src/github-signal-relay.ts apps/server/src/shared/lib/logger.ts
git add -u
git commit -m "chore: remove Hono and Durable Object files"
```

- [ ] **Step 3: Update .gitignore**

```
.env
.env.local
*.dump
packages/api/contract.json
```

- [ ] **Step 4: Final commit**

```bash
git add .gitignore
git commit -m "chore: update gitignore for self-hosted setup"
```

---

## Task 20: Frontend `OpenAPILink` Switch

> **Foldout:** [`foldouts/task-20-openapi-link.md`](./foldouts/task-20-openapi-link.md)
> **Pitfalls:** Read [`PITFALLS.md`](./PITFALLS.md) entries #12, #13, #14 (streaming).
> **Markers:**
> `@blocker-if`: `packages/api/contract.json` exists (Task 7 must be committed).
> `@done-when`: `pnpm --filter @tsu-stack/web build` exits 0 AND `curl -s http://localhost:5000/<procedure-name>` returns 200 against the running server.
> `@verify`: browser DevTools network shows POST requests to `http://localhost:5000/...` (NOT /rpc).

The browser-side `RPCLink` is replaced by `OpenAPILink` because `@orpc/nest`
mounts routes via `OpenAPIHandlerCodecCore`. SSR continues to use
`createRouterClient(appRouter, …)` in-process. Authorization cookies continue
to ride on requests (Better Auth sets `better_auth.session_token`).

**Files:**

- Modify: `packages/api/src/client/tanstack-start/orpc.ts`

- [ ] **Step 1: Install `@orpc/openapi-client` on the web side**

```bash
pnpm add @orpc/openapi-client @orpc/contract --filter @tsu-stack/web
```

- [ ] **Step 2: Update `packages/api/src/client/tanstack-start/orpc.ts`**

```typescript
import { createORPCClient, eventIteratorToUnproxiedDataStream } from "@orpc/client";
import { createRouterClient, type RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { auth } from "@tsu-stack/auth";
import { type OrpcContextMediaBucket } from "@tsu-stack/core";
import { createDb, runWithDb } from "@tsu-stack/db";
import { ENV_WEB_ISOMORPHIC } from "@tsu-stack/env/web/env.isomorphic";
import { createLogger } from "@tsu-stack/logger/server";

// Server-side: in-process oRPC adapter (unchanged concept)
// Client-side: shape-minified contract.json used as RouterContract for OpenAPILink
import { type AppRouter, appRouter } from "#@/routers/index";
import contractJson from "@tsu-stack/api/contract.json";

const getORPCClient = createIsomorphicFn()
  .server(() =>
    // unchanged: SSR uses createRouterClient(appRouter, …) in-process
    createRouterClient(appRouter, {
      context: async () =>
        runWithDb(createDb(), async () => {
          const headers = getRequestHeaders();
          const session = await auth.api.getSession({ headers });
          // ... rest of createContext (unchanged)
          return {
            github: {
              /* unchanged */
            },
            logger: createLogger({ operation: "web__client__orpc" }),
            session /* ... */
          };
        }),
      interceptors: [
        (options) => {
          const db = createDb();
          return runWithDb(db, () => options.next());
        }
      ]
    })
  )
  .client((): RouterClient<AppRouter> => {
    if (typeof window === "undefined") {
      throw new Error("Browser-only code reached");
    }
    const link = new OpenAPILink(contractJson as unknown as RouterContract<typeof appRouter>, {
      url: `${ENV_WEB_ISOMORPHIC.VITE_SERVER_URL}`,
      fetch(url, options) {
        return window.fetch(url, { ...options, credentials: "include" });
      }
    });
    return createORPCClient(link);
  });

export const orpcClient = getORPCClient();
export const orpcQueryClient = createTanstackQueryUtils(orpcClient);
export { eventIteratorToUnproxiedDataStream };
```

- [ ] **Step 3: Verify `useQuery` / `useMutation` call sites don't change**

The shape of `useQuery(orpcQueryClient.someRouter.someProcedure.queryOptions({ input }))` is identical
between `RPCLink` and `OpenAPILink`. No app code needs to change.

- [ ] **Step 4: Run `pnpm --filter @tsu-stack/api build:contract`** before booting the web app (already wired as `prebuild`).

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/client/tanstack-start/orpc.ts packages/web/package.json pnpm-lock.yaml
git commit -m "feat: switch browser client to OpenAPILink"
```

---

## Summary

| Task      | Description                                                             | Est. Time    | Foldout                                                        |
| --------- | ----------------------------------------------------------------------- | ------------ | -------------------------------------------------------------- |
| 1         | Infrastructure Setup (Docker Compose, postgres + redis + minio init-db) | 30 min       | -                                                              |
| 2         | Dockerfiles (server + web; agent Dockerfile removed per ADR-0018)       | 15 min       | -                                                              |
| 3         | NestJS Server Setup (main.ts, app.module, reflect-metadata)             | 45 min       | [`foldouts/task-03-…`](./foldouts/task-03-nestjs-bootstrap.md) |
| 4         | DB Scope Interceptor (CRITICAL)                                         | 20 min       | -                                                              |
| 5         | Request-Scoped Context Provider                                         | 30 min       | -                                                              |
| 6         | Guards, Decorators, Filters, Interceptors                               | 30 min       | -                                                              |
| 7         | oRPC client-side contract.json (minify)                                 | 15 min       | -                                                              |
| 8         | Auth Module (Better Auth passthrough)                                   | 20 min       | -                                                              |
| 9         | GitHub Module (WebSocket + Controller, Redis adapter)                   | 30 min       | -                                                              |
| 10        | Feature Controllers (8 routers, @Implement)                             | 30 min       | -                                                              |
| 11        | Mastra Module (register @mastra/nestjs + OtelBridge)                    | 30 min       | [`foldouts/task-11-…`](./foldouts/task-11-mastra-module.md)    |
| 12        | Media Module (MinIO)                                                    | 20 min       | -                                                              |
| 13        | Cache Module (Redis with getClient/getSubscriber accessors)             | 15 min       | -                                                              |
| 14        | Health Module                                                           | 15 min       | -                                                              |
| 15        | Agent Migration (PostgresStore, drop CF deps, OtelBridge)               | 25 min       | -                                                              |
| 16        | Web Migration                                                           | 15 min       | -                                                              |
| 17        | Data Migration (temporary, delete-after-use)                            | 15 min       | [`foldouts/task-17-…`](./foldouts/task-17-data-migration.md)   |
| 18        | MinIO Bucket Setup                                                      | 10 min       | -                                                              |
| 19        | Final Cleanup                                                           | 15 min       | -                                                              |
| 20        | Frontend OpenAPILink swap                                               | 30 min       | [`foldouts/task-20-…`](./foldouts/task-20-openapi-link.md)     |
| **Total** |                                                                         | **~7 hours** |                                                                |

### Pitfalls Summary

| #   | Where it bites                                                                                                   | Files                                          |
| --- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 1   | `reflect-metadata` not imported / not on `package.json`                                                          | `apps/server/src/main.ts`                      |
| 2   | `@Get()` decorator colliding with `@Implement`                                                                   | Feature controllers (Task 10)                  |
| 3   | `ORPCModule.forRoot({ interceptors: [] })` left empty                                                            | `app.module.ts`                                |
| 4   | User adds own `@All('*')` catch-all                                                                              | Anywhere in apps/server                        |
| 5   | Stale Cloudflare config in `apps/agent/src/mastra/index.ts`                                                      | Task 15 remove-list                            |
| 6   | Catalog dependency not installed                                                                                 | `pnpm-workspace.yaml`                          |
| 7   | `apps/agent/Dockerfile` re-created by reflex                                                                     | Task 2 (removed)                               |
| 8   | `apps/server/src/modules/agent/` needs files anyway                                                              | Task 11 (intentionally empty)                  |
| 9   | `AgentService` HTTP proxy resurrected                                                                            | Task 11 (no proxy)                             |
| 10  | `pnpm db:migrate` doesn't exist; use `pnpm db migrate`                                                           | Task 17 foldout                                |
| 11  | `instrumentation.ts` not preloaded                                                                               | Task 11 foldout                                |
| 12  | `RouterClient<AppRouter>` instead of `JsonifiedClient<...>`                                                      | Task 20 foldout                                |
| 13  | `OpenAPILink` typings need `as unknown as RouterContract`                                                        | Task 20 foldout                                |
| 14  | Auth body streaming broken                                                                                       | Task 8                                         |
| 15  | `agentWorker` field stale                                                                                        | Task 5                                         |
| 16  | `tsconfig.json` overrides workspace base                                                                         | Task 3 foldout                                 |
| 17  | `MastraModule.register` not last in `imports: []`                                                                | Task 11 foldout                                |
| 18  | Rate limit cap (20/min) on dev                                                                                   | Task 11 module options                         |
| 19  | Local-dev `.env` and Docker `.env.docker` are separate                                                           | PITFALLS section #19                           |
| 20  | `DATABASE_URL` URL-encode special chars in passwords                                                             | PITFALLS section #20                           |
| 21  | Webhook signal broadcast regression — DO call GithubService.broadcastSignals                                     | PITFALLS section #21                           |
| 22  | `@tsu-stack/env` schema still references CF-era vars; remove AGENT*WORKER_URL / TURSO*\* / WORKERS_CI_COMMIT_SHA | PITFALLS section #22                           |
| 23  | Keep the `runtimeRequired()` helper in @tsu-stack-env                                                            | PITFALLS section #23                           |
| 24  | Add new CLI deps to `pnpm-workspace.yaml` catalog, not raw versions                                              | PITFALLS section #24                           |
| 25  | Browser-log endpoint `POST /_logs/ingest` must be re-implemented in NestJS                                       | PITFALLS section #25 (Task 9)                  |
| 26  | Browser client switches from raw `WebSocket` to `socket.io-client`                                               | PITFALLS section #26 (Task 9)                  |
| 27  | Webhook raw body capture for HMAC verification                                                                   | PITFALLS section #27 (Task 3 main.ts + Task 9) |

### Architectural Decisions (ADRs)

1. **ADR-0018** — Collapse `server` + `agent` into one NestJS process via `@mastra/nestjs`. Single container, unified OTEL distributed trace.
2. **ADR-0019** — Mount oRPC routers via `@orpc/nest` `OpenAPIHandlerCodecCore` and switch the browser client to `OpenAPILink`. Reuse existing `appRouter` (handlers included).
3. **ADR-0020** — Mastra observability uses `MastraStorageExporter` + `OtelBridge` for unified NestJS+Mastra traces.
4. **ADR-0021** — Cross-instance WS broadcast via `@socket.io/redis-adapter` (Redis pub/sub). Required for horizontal scaling; the Durable Object's fire-and-forget semantics map 1:1.

### Plan Revisions From Original

| Delta                                                                                                          | Where                                      | Why                                                           |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------- |
| DB Scope Interceptor                                                                                           | NEW Task 4                                 | Replaces fragile `runWithDb` middleware                       |
| Request Context Provider                                                                                       | NEW Task 5                                 | Replaces manual `createContext()`                             |
| Auth Module (Better Auth passthrough)                                                                          | NEW Task 8                                 | Needed for `/auth/*` routes                                   |
| Feature Controllers via `@Implement(appRouter.x)`                                                              | Task 10                                    | Reuses existing handlers, no duplication                      |
| Mastra registered in NestJS app                                                                                | Task 11                                    | Single process, no HTTP proxy                                 |
| OpenAPILink client                                                                                             | NEW Task 20                                | Required by `OpenAPIHandlerCodecCore`                         |
| `@socket.io/redis-adapter` for WS broadcast                                                                    | Task 9 / Task 13 (CacheService)            | Cross-instance fan-out via Redis pub/sub                      |
| `MastraStorageExporter` + `OtelBridge`                                                                         | Task 15                                    | Local Studio traces + unified NestJS/Mastra distributed trace |
| `docker-entrypoint.sh` runs `drizzle-kit migrate` on boot                                                      | Task 2 (server Dockerfile)                 | Idempotent migrations; safe across replicas                   |
| Rename `/hono/create-context.ts` → `/build-context.ts` accepting `{ headers, runWithDb, mediaBucket, logger }` | All three sites (Hono legacy, NestJS, SSR) | One builder, three callers                                    |
