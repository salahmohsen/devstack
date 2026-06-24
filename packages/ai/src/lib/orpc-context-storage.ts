/**
 * AsyncLocalStorage bridge for the Hono per-request `OrpcContext`.
 *
 * The Hono `/*` middleware in `apps/server/src/app.ts` builds the
 * `OrpcContext` (octokit, kv binding, signal relay, logger, session) and
 * runs the rest of the middleware chain inside an
 * `orpcContextStorage.run(context, ...)` scope. The Mastra Hono
 * adapter's `createContextMiddleware` creates its own `RequestContext`
 * from the request body and overwrites `c.get("requestContext")`, so the
 * `orpcContext` is not visible to the tool execution context via the
 * requestContext. The bridge below lets tools read the live
 * `OrpcContext` from the AsyncLocalStorage as a fallback when
 * `context.requestContext.get("orpcContext")` is missing.
 *
 * See plans/2026-06-22-mastra-ai-test.md #22.
 */
import { AsyncLocalStorage } from "node:async_hooks";

import { type OrpcContext } from "@tsu-stack/core/ai/orpc-context";

export const orpcContextStorage = new AsyncLocalStorage<OrpcContext>();
