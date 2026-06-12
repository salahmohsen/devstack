# Learning Record: evlog Logger Workflow

## Date

2026-06-10

## Context

Second session studying the `portfolio-v2` GitHub integration. The goal was to understand how `@tsu-stack/logger` and evlog wide events move through Hono, oRPC, and the GitHub package helpers.

## Insight

### Three logger types, three use cases

1. **`RequestLogger`** — Created by `honoLoggerMiddleware`, stored as `c.get("log")`, passed into oRPC as `context.logger`, and emitted automatically when the request finishes.
2. **`createLogger()` (standalone)** — For jobs, scripts, and background work outside request scope. The caller must call `.emit()` manually.
3. **`log` (global singleton)** — Immediate fire-and-forget logging for one-off events that do not need request correlation.

### Current GitHub package pattern

The GitHub readers no longer rely on a standalone `createLogger()` pattern for `getRepoOverview`. They now accept the optional `OrpcContext` and use helper functions from `packages/github/src/repo/shared.utils.ts`:

- `setRepoLoggerContext(...)`
- `setRepoLoggerOutcome(...)`
- `setRepoLoggerLocalFirstOutcome(...)`

That means repo readers can enrich `context.logger` when they are called from oRPC without owning emission themselves.

### Current code quality observations

1. **The old `getRepoOverview` missing-emit bug is fixed**: `getRepoOverview` now uses request-scoped logger helpers through optional `OrpcContext`, not a module-scoped standalone logger.
2. **Most procedures still underuse `context.logger`**: the plumbing exists everywhere, but many handlers still rely on helper-level context only or no request sub-events at all.
3. **`health.live` still uses global `log.info()`**: this works, but it loses request correlation compared with `context.logger`.

### Best practice confirmed

For code that already runs inside an oRPC request, prefer passing context or request-scoped logging helpers through the call chain and let middleware own `.emit()`. Reserve `createLogger()` for work that genuinely has no request wrapper.

### Anti-pattern still worth remembering

Calling `context.logger.emit()` inside a handler seals the logger early. The middleware's later auto-emit becomes a no-op. Use `.set()` and `.info()/.warn()/.error()` during the request and let the middleware flush once.

## Consequences

- Future GitHub procedures should continue enriching `context.logger` instead of creating nested standalone loggers.
- If `health.live` needs request-correlation, move it from global `log` usage to `context.logger`.
- Logger-focused docs should describe `getRepoOverview` as a request-scoped helper example, not as a broken standalone logger example.

## Revision Notes

- Updated on 2026-06-13 to reflect the current `getRepoOverview` implementation and remove the stale missing-emit claim.
