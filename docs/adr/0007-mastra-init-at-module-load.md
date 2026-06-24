# 0007 — Mastra Hono adapter must init at module load, not per request

The `@mastra/hono` server adapter (`MastraServer`) calls `app.get/post/...` to register its API routes during `init()`. Hono's router matcher is built lazily on the first `app.fetch()` call; any route added after that throws `Can not add a route since the matcher is already built.` Therefore `init()` must run at module load (synchronously awaited before the first request), not lazily inside a per-request middleware.

In Cloudflare Workers, the `env` is reachable at module load via the `cloudflare:workers` virtual module (`import { env } from "cloudflare:workers"`). The `@cloudflare/vite-plugin@1.42.0` supports this in dev. This makes a single fully-initialized `Mastra` instance constructible at module load, which is what `MastraServer.init()` requires.

The "fire-and-forget" pattern (`void mountMastra(app)`) and the "lazy per-request init" pattern (`app.use("*", async (c, next) => { ... await server.init(); await next(); })`) both leave a window where the first request reaches the Hono router before the Mastra routes are registered. Both fail with the matcher error.

The corrected pattern: create the `Mastra` instance at module load with `env` resolved synchronously, then `await mountMastra(app, mastra)` before exporting the app. No per-request dance, no lazy singleton, no throwing proxy.
