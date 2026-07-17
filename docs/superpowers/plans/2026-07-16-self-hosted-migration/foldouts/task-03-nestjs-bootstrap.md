# Foldout: Task 3 — NestJS Server Setup

**This foldout expands Task 3 in `plan.md`.** Read both.

## Goal

Replace Hono's `app.fetch` / `worker.ts` with a NestJS application
that hosts all migration-time additions: oRPC routes (via
`@orpc/nest`), Better Auth passthrough, Mastra (via `@mastra/nestjs`),
DB scoping interceptor, and request context provider.

## Pre-Conditions (`@blocker-if`)

- [ ] `apps/server/package.json` currently still has `hono` deps
      that need to come out — remove `@hono/*`, `hono`, `wrangler`,
      `cross-env`, `@cloudflare/vite-plugin`, etc.
- [ ] `@tsu-stack/tsconfig` workspace exposes a `node` preset — verify
      before extending.

## Files to Create / Modify

- Modify: `apps/server/package.json`
- Modify: `apps/server/tsconfig.json`
- Create: `apps/server/nest-cli.json`
- Create: `apps/server/src/main.ts`
- Create: `apps/server/src/app.module.ts`
- Create: `apps/server/src/instrumentation.ts` _(Task 11 will reference)_

## Done-When (`@done-when`)

Run from repo root:

```bash
pnpm --filter @tsu-stack/server install  # installs reflect-metadata and friends
pnpm --filter @tsu-stack/server build    # must compile cleanly
```

A successful run prints `Successfully compiled` and exits 0.

## Pitfall 1: `reflect-metadata` MUST be on deps and imported at boot

Add `reflect-metadata` to `apps/server/package.json` `dependencies`,
version `^0.2.2` (NestJS 11 requirement).

`apps/server/src/main.ts` MUST begin with:

```typescript
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
// ... rest
```

If `reflect-metadata` is missing or placed AFTER NestFactory,
decorators silently fail at runtime with
`Reflect.getMetadata is not a function`.

## Pitfall 2: `tsconfig.json` extends WS base, doesn't reset it

Do NOT overwrite ESM/moduleResolution:

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

If a weak executor replaces `module: "Preserve"` from the base with
`module: "CommonJS"`, NestJS's DI breaks at runtime.

## Pitfall 3: `ORPCModule.forRoot({ interceptors: [] })` is the empty intent

Do NOT add `oRPC` `interceptors` here. NestJS-level guards and
interceptors carry cross-cutting concerns. This entry stays empty
intentionally. The placeholder comment in `plan.md` is preserved.

## Pitfall 4: NO catch-all controllers in your own code

`MastraModule.register({ prefix: '/agent' })` already injects
`@All('*')` for its routes. `@orpc/nest`'s `ImplementInterceptor`
registers `GET/POST/...` from contracts. Do NOT write `@Controller('rpc')`
or `@All('*')` yourself.

## Pitfall 5: Architectural reviewer will fail if Swagger is wired without `implement()` OpenAPI metadata

The plan adds `@nestjs/swagger`. For OpenAPI routes registered via
`@Implement`, the routes' metadata (input/output schemas) come
from oRPC's `OpenAPIHandlerCodecCore`, NOT from `@nestjs/swagger`'s
schema walker. Swagger's spec is empty for those routes unless we
add `@ApiProperty`/`@ApiBody` annotations, which we won't.

**Acceptable**: Use Swagger only for routes that EXPLICITLY use
NestJS decorators (none yet). Enable the `/docs` route only as a
placeholder for future non-oRPC endpoints. The real OpenAPI spec
lives at `GET /openapi.json` produced by `@orpc/openapi` if we want
to expose it.

If the executor reflexively enables Swagger docs on Day 1, that's
fine but won't show oRPC routes. Move on.

## Order

Files in this exact order:

1. `apps/server/package.json` (with all deps listed in plan)
2. `pnpm --filter @tsu-stack/server install`
3. `apps/server/tsconfig.json`
4. `apps/server/nest-cli.json`
5. `apps/server/src/main.ts` (with `reflect-metadata` first)
6. `apps/server/src/instrumentation.ts` (empty boilerplate here;
   Task 11 fills it in)
7. `apps/server/src/app.module.ts` (with stubs for missing modules
   that Tasks 4-14 will fill — use placeholders until then)
8. `pnpm --filter @tsu-stack/server build` — must pass

## Manual Verification (before commit)

```bash
pnpm --filter @tsu-stack/server build 2>&1 | tail -3
```

Expected: `Compiled successfully` or `Nest application successfully
compiled`. Empty output means missing modules — go back to Step 7
and comment out. Stub-until-replaced is the correct posture.

The `AppModule` for the FIRST compile may have to comment out
all the unimplemented modules. Pattern:

```typescript
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ORPCModule.forRoot({ interceptors: [] })]
})
export class AppModule {}
```

Tasks 4-14 progressively add providers/modules.

## Commit

```bash
git add apps/server/package.json apps/server/tsconfig.json apps/server/nest-cli.json apps/server/src
git commit -m "feat(server): bootstrap NestJS + oRPC + reflect-metadata"
```
