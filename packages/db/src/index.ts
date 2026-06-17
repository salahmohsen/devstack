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
 * Throws if a repository is called outside of `runWithDb(...)`, which always
 * means a missing Hono middleware wrapper.
 */
export function getDb(): WsDb {
  const store = dbStorage.getStore();
  if (!store) {
    throw new Error(
      "getDb() called outside of a request. Wrap the request handler with runWithDb(createDb(), ...)."
    );
  }
  return store.db;
}

export async function checkIsDbReady(): Promise<boolean> {
  try {
    await db.execute(sql`SELECT 1`);
    return true;
  } catch {
    return false;
  }
}
