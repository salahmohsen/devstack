# Learning Record: evlog Logger Workflow

## Date

2026-06-10

## Context

Second session studying the portfolio-v2 GitHub integration. Wanted to understand how the logging infrastructure works — specifically how `@tsu-stack/logger` (a facade over evlog v2.18) creates, propagates, and emits "wide events" throughout the request lifecycle.

## Insight

### Three logger types, three use cases

1. **`RequestLogger`** — Created by Hono middleware (`honoLoggerMiddleware`), stored as `c.get("log")`, passed through oRPC context as `context.logger`. Auto-correlated with HTTP method, path, requestId, duration, status. `.emit()` called automatically by middleware at response time.

2. **`createLogger()` (standalone)** — For jobs, background tasks, or functions like `getRepoOverview` that may run outside request context. Caller must call `.emit()` manually — without it the event is silently dropped.

3. **`log` (global singleton)** — Fire-and-forget facade. Each call flushes immediately. No `.emit()` needed. Best for one-off events (server startup, health check results outside requests).

### Key architectural flow

```
honoLoggerMiddleware → c.get("log")
  → createContext({ context: c, logger: c.get("log") })
    → OrpcContext.logger available in every procedure via publicProcedure
```

### Two code quality issues discovered

1. **Missing `.emit()` in `getRepoOverview`** (`packages/github/src/repo/get-repo-overview.ts:27-30`): The standalone logger calls `.set()` but never `.emit()`. The wide event is silently dropped. Additionally, the logger is module-scoped (reused across calls) instead of function-scoped.

2. **`context.logger` is never used in any oRPC procedure**: Every procedure receives `context.logger` but none call it. The only procedure that logs (`health.live`) uses the global `log.info()` instead, losing request correlation (method, path, requestId, duration).

### Best practice discovered

When a core function like `getRepoOverview` is always called from an oRPC handler (which has `context.logger`), accept an optional `RequestLogger` parameter. Use it when available; fall back to `createLogger` otherwise. This gives request correlation when inside a request, and standalone behavior otherwise.

### Anti-pattern: early `.emit()` seals the logger

If you call `context.logger.emit()` manually inside a handler, the logger is sealed. The middleware's auto-emit becomes a no-op. Solution: use `.set()` and `.info()/.warn()/.error()` to accumulate context, and let middleware handle the final emit.

## Consequences

- Future work adding logging to procedures should use `context.logger.set()` and `.info()` for request-correlated events
- The `getRepoOverview` standalone logger should be fixed to either (a) call `.emit()` or (b) accept an optional `RequestLogger` parameter
- The health router should probably use `context.logger` instead of global `log` for request-correlated health checks
- The standalone `createLogger` should generally be created inside a function (not at module scope) to avoid context bleeding across calls

## Revision Notes

- (empty)
