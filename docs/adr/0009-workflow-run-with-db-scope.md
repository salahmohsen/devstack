# 0009 — Workflow runs share the request's `runWithDb` scope

A Mastra workflow started inside a `runWithDb(createDb(), ...)` handler — or
inside the cron `scheduled` handler — runs in the same `AsyncLocalStorage`
scope as the handler. The pool is not closed at request end; it lives for
the worker's lifetime, kept alive by `c.executionCtx.waitUntil(...)` when
work continues past the response.

## Context

`runWithDb` in `packages/db/src/index.ts:52` opens an `AsyncLocalStorage`
scope so `getDb()` can read the per-request Drizzle instance. The
per-request WebSocket pool is required for `db.transaction(...)` and
prepared-statement reuse.

`getDb()` reads `dbStorage.getStore()` first and falls back to the HTTP
Drizzle singleton only when no scope is active. The HTTP transport is
stateless, so the fallback is "safe enough" for simple reads, but it
cannot service `db.transaction(...)`.

The `refreshIdentityWorkflow` writes facets via
`identityRepository.writeFacet(...)`, which uses `db.transaction(...)`
internally (`packages/db/src/repositories/identity.repository.ts:56`).

## Decision

`runWithDb` does **not** call `pool.end()`. The pool's lifetime is the
worker's, kept alive by `c.executionCtx.waitUntil(...)` when work
outlives the request. Cloudflare closes connections on isolate
destruction; we don't need to.

At every call site that starts `refreshIdentityWorkflow`:

- **HTTP webhook (`apps/server/src/app.ts`):** use the Hono `/*`
  middleware's `runWithDb` scope. The workflow inherits the request's
  pool via `async_hooks`. `c.executionCtx.waitUntil(run.start(...))`
  keeps the isolate alive until the workflow resolves.
- **Cron (`apps/server/src/worker.ts`):** open a per-run
  `runWithDb(createDb(), () => run.start(...))` scope. There is no
  outer request scope, so the inner scope provides the
  transaction-capable pool. `ctx.waitUntil(...)` keeps the isolate
  alive.

## Why the pool must not be closed in `runWithDb`

Closing the pool in `runWithDb.finally` causes a race when work outlives
the request. A Mastra `run.start(...)` resolves when the run record is
created, not when all steps finish — the remaining steps run
asynchronously via the workflow engine's internal scheduler. If the
request returns (and `runWithDb` fires its `finally`) before all steps
have run, the later steps' `getDb()` returns a pool that has been
`pool.end()`-ed, and the next query fails with `DrizzleQueryError:
Cannot use a pool after calling end on the pool`.

Cloudflare Workers isolate lifetime is the right boundary. The runtime
closes any open connections when the isolate is destroyed. `waitUntil`
extends the isolate's life past the request. So the pool survives for
the workflow's full duration, and the runtime cleans up when the
workflow resolves and the isolate becomes idle.

The earlier reading of Neon's "Pool and Client" docs that motivated
the `pool.end()` call was wrong: Neon's docs warn against _sharing_ a
pool across requests (the WebSocket from request A may be killed by
the runtime and reused for request B, causing cross-request
contamination). They do not say to close the pool at the end of every
request. The end-of-request close was defensive coding that became a
race the moment a workflow started running past the request.

## Why the inner `runWithDb` is needed for cron but not for the webhook

**Webhook (HTTP):** the `/*` middleware at
`apps/server/src/app.ts:301-352` already wraps the request in
`runWithDb(createDb(), async () => { ... })`. The webhook handler runs
inside that scope, so the workflow's async chain captures the
`AsyncLocalStorage` store via `async_hooks` and `getDb()` resolves to
the request's pool throughout the workflow. The webhook handler
**must not** wrap `run.start(...)` in its own `runWithDb` — that would
shadow the outer store and own a second pool that is closed at the
inner `runWithDb`'s `finally`, reintroducing the race.

**Cron:** `apps/server/src/worker.ts:21-37` runs outside any HTTP
request, so there is no outer `runWithDb` scope. Without an inner
scope, the workflow's steps fall back to the HTTP Drizzle singleton
via `getDb()`. `select()` works, but
`identityRepository.writeFacet(...)` calls `db.transaction(...)` —
which the HTTP transport does not support — and the `write-facets`
step throws. The inner `runWithDb` provides the transaction-capable
pool.

## Alternatives considered

- **Close the pool in `runWithDb.finally` (the old design).** Race
  condition. Rejected.
- **Use the HTTP Drizzle singleton in the workflow steps** (cast `db`
  to `WsDb` and accept the `transaction` limitation). Breaks
  auto-write proposals the moment any step needs a transaction.
  Rejected.
- **Per-run pool, closed in the run's `onFinish` hook.** Semantically
  cleanest. Not implementable today: Mastra's `WorkflowRun` does not
  expose a true "all steps done" handle. `run.start()` is shallow. If
  Mastra ships a real completion handle (e.g. `run.finished` or a
  streamable `run.results`), revisit this option.
- **Detach the workflow from the outer `AsyncLocalStorage` context**
  (e.g. schedule `run.start` via `setImmediate`). Fragile and
  surprising; readers would have to know that the workflow starts in
  a different async context than the handler that scheduled it.
  Rejected.

## Consequences

- The `runWithDb` pool is not closed at request end. In production
  (Cloudflare Workers), this is fine: the runtime closes connections
  on isolate destruction. In the long-lived dev server (`vp dev`),
  per-request pools accumulate until the dev server restarts. The dev
  server is restarted regularly; connection accumulation is bounded
  by Neon's own idle-connection timeout (~30s) and V8 GC of
  unreachable pool objects. Not a correctness concern.
- A new call site that starts a workflow from a request must use the
  Hono `/*` middleware's scope (no inner `runWithDb`). A new call
  site that starts a workflow outside a request (cron, custom
  scheduler) must wrap in its own `runWithDb(createDb(), ...)`. This
  is documented at the top of `apps/server/src/worker.ts` and at the
  webhook handler in `apps/server/src/app.ts`.

## Regression test

The earlier race was non-deterministic: under load, the workflow's
`diff-facets` step failed with `DrizzleQueryError: Cannot use a pool
after calling end on the pool` ~50% of the time. After this fix, the
exact payload that reproduced the race
(`commitSha: 948a43796c08d2d65582e9b4968f7729afd739f6`) succeeds
deterministically.

## Files changed

- `packages/db/src/index.ts` — `runWithDb` no longer closes the pool
  in `finally`. Comment updated.
- `apps/server/src/app.ts` — webhook handler drops the inner
  `runWithDb` wrapper.
- `apps/server/src/worker.ts` — comment updated to reflect that the
  inner `runWithDb` is still required for the cron path (no outer
  request scope). Code unchanged.
