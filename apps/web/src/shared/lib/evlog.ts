/**
 * Local barrel of wide-event factories for server route handlers.
 *
 * `evlog map` only treats imports as instrumented when they resolve to `evlog`
 * or a workspace file that re-exports from `evlog` (module key `evlog`).
 * Prefer `@tsu-stack/logger/server` for app boot/middleware; use this barrel
 * in route handlers so static coverage scoring works without scattering
 * `from "evlog"` across features.
 *
 * Runtime still goes through the same factories as the logger package.
 */
export { createError, createLogger, createRequestLogger, log } from "evlog";
