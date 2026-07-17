# Foldout: Task 11 — Mastra Module + OtelBridge

**This foldout expands Task 11 in `plan.md`.** Read both AND
`PITFALLS.md` items 1, 5, 9, 11, 17.

## Goal

Mount the existing `apps/agent/src/mastra/index.ts` `Mastra`
instance inside the NestJS app via `MastraModule.register`, with
`OtelBridge` configured for unified traces.

## Pre-Conditions

- [ ] Task 3 environment is up (`packages/server` compiles,
      `reflect-metadata` imported, `ORPCModule.forRoot` present)
- [ ] Task 4 (DbScopeInterceptor) is committed and registered
- [ ] Task 15 (Mastra migration: PostgresStore, drop CSF) has been
      drafted but NOT necessarily committed — Task 15 lands in the
      same PR as Task 11 to keep `apps/agent/src/mastra/index.ts`
      consistent with `apps/server/src/app.module.ts`

## Files to Modify

- Modify: `apps/agent/src/mastra/index.ts` (Task 15's removals
  - add OtelBridge)
- Modify: `apps/agent/package.json` (Task 15's deps)
- Modify: `apps/server/src/instrumentation.ts` (full
  OTel SDK setup per PITFALLS.md #11)
- Modify: `apps/server/src/main.ts` (--require instrumentation
  before main)
- Modify: `apps/server/src/app.module.ts` (MastraModule.register
  LAST)

## Canonical `instrumentation.ts` (`@done-when` built and exits 0)

```typescript
// apps/server/src/instrumentation.ts
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

const sdk = new NodeSDK({
  serviceName: process.env.OTEL_SERVICE_NAME ?? "personal-hub-server",
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318/v1/traces"
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-fs": { enabled: false }
    })
  ]
});

sdk.start();

process.on("SIGTERM", async () => {
  await sdk.shutdown();
  process.exit(0);
});
```

## Canonical `main.ts` invocation order

```typescript
// apps/server/src/main.ts
import "./instrumentation.js"; // MUST be first line
import "reflect-metadata"; // PITFALLS.md #1 — before NestFactory
import { NestFactory } from "@nestjs/core";
// ... rest
```

Wait — `import "./instrumentation.js"` is statically resolved by
the bundler. With `tsc` output, that's
`dist/instrumentation.js`. We need to run instrumentation
**before** the rest:

**Option A** (preferred): Use Node's `--require` flag to preload
instrumentation:

```json
"scripts": {
  "start": "node --require ./dist/instrumentation.js dist/main.js"
}
```

And the files must be COMPILED such that
`apps/server/dist/instrumentation.js` exists.

**Option B**: Convert `instrumentation.ts` to use top-level `await`:

```typescript
// apps/server/src/instrumentation.ts
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

const sdk = new NodeSDK({...});

await sdk.start();

await import("./main.js");
```

Use `--experimental-detect-module` or compile target ES2022.

The plan uses Option A.

## Canonical `app.module.ts` Mastra registration

```typescript
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ORPCModule } from "@orpc/nest";
import { MastraModule } from "@mastra/nestjs";

import { mastra } from "../../agent/src/mastra/index.js";
// ... other module imports

@Module({
  imports: [
    ORPCModule.forRoot({ interceptors: [] }), // global (orpc can't be last safely)
    // ... feature modules ...
    MastraModule.register({
      // ← LAST (catch-all @All)
      mastra,
      prefix: "/agent",
      rateLimitOptions: {
        enabled: process.env.NODE_ENV !== "development",
        defaultLimit: 200,
        generateLimit: 20,
        windowMs: 60_000
      },
      streamOptions: {
        redact: true,
        heartbeatMs: 20_000
      },
      shutdownOptions: {
        timeoutMs: 30_000,
        notifyClients: true
      }
    })
  ]
})
export class AppModule {}
```

## Pitfall: `OtelBridge` requires `instrumentation.ts` side AND `serviceName` on `Mastra`s `Observability`

`apps/agent/src/mastra/index.ts` lines around the existing
`Observability` config (after Task 15 cleanup). ONE single
`Observability` config goes here; OtelBridge is wired via
`bridge: new OtelBridge()`, NOT a separate config:

```typescript
import { OtelBridge } from "@mastra/otel-bridge";

export const mastra = new Mastra({
  // ... tasks 15 cleanup ...
  observability: new Observability({
    configs: {
      default: {
        serviceName: "personal-hub-mastra",
        bridge: new OtelBridge(), // ← MUST be in the active config
        exporters: [
          new MastraStorageExporter(), // Persists to Postgres for Studio
          new SensitiveDataFilter()
        ],
        logging: { enabled: true, level: "info" }
      }
    },
    configSelector: () => "default"
  })
});
```

## Pitfall: `Mastra` instance must be MOVABLE out of `apps/agent` later

The `apps/agent/src/mastra/index.ts` file imports server-only
modules. If `apps/agent` becomes a separate container later,
those imports move to the server. Today, it's fine to share the
imports across apps because both run in the same Node process
(at different ports). Keep imports as-is.

## Done-When

```bash
pnpm --filter @tsu-stack/server build
node --require ./dist/instrumentation.js dist/main.js
# Expected: registered "personal-hub-mastra" service in OTel SDK,
# server listens on :5000, GET /agent/api/agents returns 200.
```

## Commit

```bash
git add apps/agent/src/mastra/index.ts apps/agent/package.json \
        apps/server/src/instrumentation.ts apps/server/src/main.ts \
        apps/server/src/app.module.ts
git commit -m "feat: register Mastra in NestJS via @mastra/nestjs + OtelBridge"
```
