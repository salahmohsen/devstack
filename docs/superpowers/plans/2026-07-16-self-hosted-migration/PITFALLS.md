# Known Pitfalls

This file collects failure modes for the Hono-on-Node.js migration.

## 1. `@hono/node-server` `serve()` API

`serve()` takes `{ fetch, port }` where `fetch` is `app.fetch`.
Do NOT pass `app` directly — pass `app.fetch`.

## 2. Redis JSON serialization

CF KV's `get(key, "json")` auto-parses. Redis returns strings.
The adapter must `JSON.parse`/`JSON.stringify` explicitly.

## 3. MinIO `putObject` expects Buffer

CF R2 accepts `ArrayBuffer`. MinIO's S3 client expects `Buffer`.
Convert with `Buffer.from(arrayBuffer)` before calling `putObject`.

## 4. Socket.IO uses `socket.io-client`, not raw WebSocket

The browser client must use `socket.io-client`, not `new WebSocket()`.
The protocol is incompatible with raw WebSocket.

## 5. Agent Worker URL must be absolute

Without CF service bindings, `AGENT_WORKER_URL` must be a full URL
(e.g. `http://agent:4111`). Relative paths will fail.

## 6. Webhook raw body for HMAC verification

GitHub webhooks require HMAC signature verification on the raw body.
Do NOT parse JSON before verification — keep the raw string.

## 7. Remove all `@mastra/deployer-cloudflare` references

The agent's `wrangler.jsonc` and CF deployer must be completely removed.
Residual imports will cause build failures.

## 8. TanStack Start Node.js entry

TanStack Start on Node.js uses `.output/server/index.mjs` as entry.
The `start` script in `package.json` must reference this path.

## 9. Keep `runtimeRequired()` in env schema

The `runtimeRequired()` helper allows optional env vars at build time.
Do NOT remove it — it's needed for CI/build environments.

## 10. `pg_dump`/`pg_restore` syntax

The migration script uses `-Fc` format for `pg_dump` and
`--clean --if-exists` for `pg_restore`. These flags are required
for idempotent migrations.

## 11. Redis connection check in health endpoint

A simple `GET` on a key doesn't verify the connection is alive.
Use `redis.ping()` for a proper health check.
