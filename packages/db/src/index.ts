import { AsyncLocalStorage } from "node:async_hooks";

import { Pool } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle as drizzleHttp, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle as drizzleWs, type NeonDatabase } from "drizzle-orm/neon-serverless";

import { ENV_SERVER } from "@tsu-stack/env/server/env";

import * as schema from "#@/schema/index";
import { relations as appRelations } from "#@/schema/relations";

export * from "drizzle-orm/sql";

/**
 * Singleton HTTP Drizzle instance.
 *
 * Used by Better Auth's drizzle adapter and any code path that needs a
 * long-lived connection (e.g. module-load wiring that runs across many
 * requests). The HTTP transport is stateless, so a module-level instance is
 * safe in Cloudflare Workers — each `fetch()` call is independent.
 *
 * Relations are composed from `relations.ts` (app relations, hand-written)
 * and the auto-generated `auth.schema.ts` (auth relations). See
 * `.agents/auth.md` for the canonical composition pattern.
 */
const { relations: authRelations } = schema;
const fullRelations = { ...appRelations, ...authRelations };

export const db: NeonHttpDatabase<typeof fullRelations> = drizzleHttp(ENV_SERVER.DATABASE_URL, {
  relations: fullRelations
});

/**
 * Per-request WebSocket Drizzle instance.
 *
 * Required for `db.transaction(...)` and the node-postgres `Pool` API. Per
 * Neon's "Pool and Client" docs, serverless WebSocket connections cannot
 * outlive a single request, so the Pool must be created inside the request
 * handler and closed at the end. Repositories use `getDb()` to read the
 * current request's instance.
 */
export type WsDb = NeonDatabase<typeof fullRelations>;

const dbStorage = new AsyncLocalStorage<{ db: WsDb; pool: Pool }>();

export function createDb(): WsDb {
  const pool = new Pool({ connectionString: ENV_SERVER.DATABASE_URL });
  return drizzleWs({ client: pool, relations: fullRelations });
}

export async function runWithDb<T>(db: WsDb, fn: () => T | Promise<T>): Promise<T> {
  const pool = (db as unknown as { $client: Pool }).$client;
  try {
    return await dbStorage.run({ db, pool }, fn);
  } finally {
    await pool.end();
  }
}

/**
 * Repository call sites use this instead of importing a singleton `db`.
 *
 * Preferred path: returns the per-request Neon WebSocket Drizzle inside the
 * `runWithDb(...)` scope opened by the server's `/*` middleware. The WebSocket
 * pool is required for `db.transaction(...)` and prepared-statement reuse.
 *
 * Defensive fallback: if no scope is active (e.g. a route was registered
 * before the `/*` middleware and forgot to wrap itself), falls back to the
 * HTTP Drizzle singleton. The HTTP transport is stateless and safe to use
 * without a per-request scope, so a missed `runWithDb` is no longer a hard
 * 500 — it just logs once and continues. Callers that need
 * `db.transaction(...)` MUST still be inside a `runWithDb` scope; the HTTP
 * fallback will throw at runtime if you try to start a transaction on it.
 */
let hasLoggedLazyDbFallback = false;
export function getDb(): WsDb {
  const store = dbStorage.getStore();
  if (store) {
    return store.db;
  }

  if (!hasLoggedLazyDbFallback) {
    hasLoggedLazyDbFallback = true;
    // This package has no logger dependency; surfacing the warning is the
    // whole point of the fallback.
    // eslint-disable-next-line no-console
    console.warn(
      "[db] getDb() called outside runWithDb. Falling back to the HTTP Drizzle singleton. " +
        "Wrap the request handler with runWithDb(createDb(), ...) for transaction support."
    );
  }

  return db as unknown as WsDb;
}

export async function checkIsDbReady(): Promise<boolean> {
  try {
    await db.execute(sql`SELECT 1`);
    return true;
  } catch {
    return false;
  }
}
