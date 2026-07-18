import { AsyncLocalStorage } from "node:async_hooks";

import { Pool } from "pg";
import { sql } from "drizzle-orm";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";

import { ENV_SERVER } from "@tsu-stack/env/server/env";

import { authRelations } from "./schema/auth.schema.ts";
import { appRelationPart } from "./schema/relations.ts";

export * from "./repositories/index.ts";
export * from "drizzle-orm/sql";

/**
 * Singleton PG Drizzle instance.
 *
 * Used by Better Auth's drizzle adapter and any code path that needs a
 * long-lived connection (e.g. module-load wiring that runs across many
 * requests). The connection pool is module-level and safe for single-instance
 * Node.js servers.
 *
 * Relations are composed from `relations.ts` (app relations, hand-written)
 * and the auto-generated `auth.schema.ts` (auth relations). See
 * `.agents/auth.md` for the canonical composition pattern.
 */
export const relations = { ...appRelationPart, ...authRelations };

export const pool = new Pool({
  connectionString: ENV_SERVER.DATABASE_URL
});

export const db: NodePgDatabase<typeof relations> = drizzlePg({
  client: pool,
  relations
});

/**
 * Per-request database instance.
 *
 * Each request gets its own pool via `createDb()`; the pool's lifetime is
 * kept alive by the request handler. Repositories use `getDb()` to read
 * the current request's instance from `AsyncLocalStorage`.
 *
 * For self-hosted PostgreSQL, we use the standard `pg` Pool directly — no
 * WebSocket/Neon-specific transport needed.
 */
export type WsDb = NodePgDatabase<typeof relations>;

const dbStorage = new AsyncLocalStorage<{ db: WsDb; pool: Pool }>();

export function createDb(): WsDb {
  const requestPool = new Pool({
    connectionString: ENV_SERVER.DATABASE_URL
  });
  return drizzlePg({ client: requestPool, relations });
}

export async function runWithDb<T>(db: WsDb, fn: () => T | Promise<T>): Promise<T> {
  const requestPool = (db as unknown as { $client: Pool }).$client;
  return dbStorage.run({ db, pool: requestPool }, fn);
}

/**
 * Repository call sites use this instead of importing a singleton `db`.
 *
 * Preferred path: returns the per-request Drizzle inside the
 * `runWithDb(...)` scope opened by the server's `/*` middleware.
 *
 * Defensive fallback: if no scope is active (e.g. a route was registered
 * before the `/*` middleware and forgot to wrap itself), falls back to
 * the PG singleton. Callers that need `db.transaction(...)` MUST still
 * be inside a `runWithDb` scope.
 */
let hasLoggedLazyDbFallback = false;
export function getDb(): WsDb {
  const store = dbStorage.getStore();
  if (store) {
    return store.db;
  }

  if (!hasLoggedLazyDbFallback) {
    hasLoggedLazyDbFallback = true;
    console.warn(
      "[db] getDb() called outside runWithDb. Falling back to the PG singleton. " +
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
