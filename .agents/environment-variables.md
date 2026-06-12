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
- GitHub OAuth for Better Auth currently depends on `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `ENV_SERVER`. Keep those documented anywhere `BETTER_AUTH_SECRET` is documented.
- `GITHUB_WEBHOOK_SECRET` is env-owned server configuration. The public GitHub owner token and username are not env vars in this repo; they stay in the owner-managed `app_settings` table.
- `ENV_WEB_ISOMORPHIC` validates `VITE_SERVER_URL`, `VITE_WEB_URL`, and optional `VITE_IMGPROXY_URL`. `ENV_WEB_SERVER` validates only `NODE_ENV`, `SOURCE_COMMIT`, and `IS_BUILD` for the web app.
- Worker bindings such as `GITHUB_CACHE_KV` and `GITHUB_SIGNAL_RELAY` live in `apps/server/wrangler.jsonc`, then flow into Hono/oRPC context from `apps/server` instead of being validated in `packages/env/src/server/env.ts`.
