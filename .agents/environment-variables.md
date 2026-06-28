# Environment Variables

## Single Source of Truth

All env vars live in `packages/env/.env` (copy from `.env.example`). Validated by Zod at import time via `@t3-oss/env-core`.

## Three Scoped Objects

| Object               | Scope                        |
| -------------------- | ---------------------------- |
| `ENV_SERVER`         | Server-only (`apps/server`)  |
| `ENV_WEB_ISOMORPHIC` | Client + server (`apps/web`) |
| `ENV_WEB_SERVER`     | Web build/server-only        |

## Client Exposure Rule

Only vars prefixed with `VITE_` are available on the client (`import.meta.env`). Server-only vars (`DATABASE_URL`, `BETTER_AUTH_SECRET`) must never be exposed to the client.

## When Adding/Updating Env Vars

Update in **six places**:

1. `packages/env/src/` — add Zod validation to the appropriate scoped object
2. `docker-compose.yaml` — add to both `build.args` and `environment` for affected services
3. `Dockerfile` — add matching `ARG` + `ENV` declarations in the relevant Dockerfile(s)
4. `.env.example` — add with placeholder value for local development
5. `.github/README.md` — update this file with the new var, its scope, and usage notes
6. (optional) `apps/web/vite.config.ts` — if the var is used in the web app or if the environment is used in the server & is mounted on the web app, add to `define` for build-time injection

Missing any of these causes build or runtime failures with no obvious error message.

Env docs and templates must mirror the validated schema in `packages/env/src/`. Do not invent, retain, or document env vars that are not actually read there. If a setting is code-owned, document it as code-owned instead of adding a new env knob.

## Gotchas

- `z.stringbool()` is used for boolean env vars (parses "true"/"false" strings)
- Dev defaults exist for the URL-style `VITE_*` vars, but server auth/database vars are still required in the server schema
- Each env file logs loading with `console.debug` — check terminal output for validation errors
- For Cloudflare local dev, Worker code does not automatically inherit arbitrary shell env vars. In this repo, `apps/web` and `apps/server` load `packages/env/.env` via `dotenvx` and set `CLOUDFLARE_INCLUDE_PROCESS_ENV=true` in their `dev` scripts so `process.env` is available inside the Worker runtime.
- GitHub OAuth for Better Auth currently depends on `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `ENV_SERVER`. Both are runtime-required (the build can run without them — the `socialProviders.github` block in `packages/auth/src/auth.ts` registers an empty provider when missing and `IS_BUILD=true`, and throws a clear error otherwise). Keep these documented anywhere `BETTER_AUTH_SECRET` is documented.
- `OPENCODE_API_KEY` is consumed by the server via `process.env` directly; the env schema marks it as runtime-required, build-time optional (the build doesn't need it).
- `GITHUB_WEBHOOK_SECRET` is env-owned server configuration. The public GitHub owner token and username are not env vars in this repo; they stay in the owner-managed `github_config` table.
- `ENV_WEB_ISOMORPHIC` validates `VITE_SERVER_URL`, `VITE_WEB_URL`, and optional `VITE_IMGPROXY_URL`. `ENV_WEB_SERVER` validates only `NODE_ENV`, `SOURCE_COMMIT`, and `IS_BUILD` for the web app.
- **Build-time vs runtime required**: `ENV_SERVER` is loaded at module import time, so the build imports it too. Most vars are runtime-only — `packages/env/src/server/env.ts` exposes a `runtimeRequired(schema)` helper that returns `.optional()` when `IS_BUILD=true` and the strict schema otherwise. The build process sets `IS_BUILD=true` via `cross-env` in `apps/web/vite.config.ts`. The build-essential vars (always required) are: `VITE_SERVER_URL`, `VITE_WEB_URL`, `VITE_IMGPROXY_URL`, `SOURCE_COMMIT`, `NODE_ENV`, `IS_BUILD`, `DATABASE_URL` (Drizzle singleton in `packages/db/src/index.ts`), and `BETTER_AUTH_SECRET` (Better Auth init in `packages/auth/src/auth.ts`). Everything else in `ENV_SERVER` is `runtimeRequired` and so optional at build. The build env list in `apps/web/vite.config.ts` only passes the build-essential vars; if you add another var that must be present at build, add it to that list too.
- Worker bindings such as `GITHUB_CACHE_KV` and `GITHUB_SIGNAL_RELAY` live in `apps/server/wrangler.jsonc`, then flow into Hono/oRPC context from `apps/server` instead of being validated in `packages/env/src/server/env.ts`.
- `DATABASE_URL` is a direct Neon endpoint. The Neon serverless WebSocket driver (`@neondatabase/serverless`) cannot use the `-pooler` hostname, and the connection must be created and closed **inside** each Hono request handler (see Neon's "Pool and Client" docs: serverless WebSocket connections cannot outlive a single request). The Hono app wraps every request in `runWithDb(createDb(), ...)` from `packages/db`, and repositories read the per-request instance via `getDb()`. The singleton HTTP `db` exported from `packages/db` exists only for Better Auth's drizzle adapter, which is initialized once at module load.
