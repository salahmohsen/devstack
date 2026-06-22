# 0004 — Mastra runs embedded in the existing Hono app, not as a standalone Worker

Mastra is mounted into the same Cloudflare Worker as oRPC, Better Auth, and the
GitHub webhook handler via `@mastra/hono`'s `MastraServer` adapter. The Hono app
in `apps/server/src/app.ts` already owns the Worker, the Cloudflare bindings
(`GITHUB_CACHE_KV`, `GITHUB_SIGNAL_RELAY`), the per-request `createDb()` Neon
pool, and the auth context. A second Worker would mean a second deployable, a
second set of bindings, a second set of secrets, and a CORS/auth handshake
between the two.

The trade-off accepted: the `apps/server` Worker grows in scope. Its size budget
gets tighter (the Workers 1 MB compressed / 10 MB uncompressed limits will be the
real ceiling eventually). When that matters, Mastra can be extracted to a
standalone Worker without changing the agent or workflow code — the surface is
intentionally package-bounded so that move is mechanical.
