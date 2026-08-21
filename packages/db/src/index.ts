import { AsyncLocalStorage } from "node:async_hooks";
import process from "node:process";

import { sql } from "drizzle-orm";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";

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

/**
 * Prefer discrete POSTGRES_* fields in Docker when POSTGRES_HOST is set
 * (avoids URL-encoding footguns with passwords containing + / =).
 * Fall back to DATABASE_URL for local docker-compose / Dokploy Postgres.
 *
 * Local `vp run dev` often has credentials only in DATABASE_URL pointing at
 * Docker-mapped localhost. Never default host to the compose service name
 * "postgres" unless POSTGRES_HOST is explicit — that host only resolves
 * inside the compose network.
 */
function createPoolConfig(): PoolConfig {
  const user = process.env.POSTGRES_USER;
  const password = process.env.POSTGRES_PASSWORD;
  const host = process.env.POSTGRES_HOST;
  const shared: PoolConfig = {
    // Fail fast — never wait forever for a slot or TCP connect.
    connectionTimeoutMillis: 8_000,
    idleTimeoutMillis: 30_000,
    // Keep local docker-desktop + multi-process dev from exhausting PG.
    max: Number(process.env.PG_POOL_MAX ?? 10),
    allowExitOnIdle: false,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000
  };

  if (user && password && host) {
    return {
      ...shared,
      host: normalizeLocalhost(host),
      port: Number(process.env.POSTGRES_PORT ?? 5432),
      user,
      password,
      database: process.env.POSTGRES_DB ?? "personal_hub"
    };
  }

  const connectionString = normalizeDatabaseUrl(ENV_SERVER.DATABASE_URL);
  return { ...shared, connectionString };
}

/** Prefer IPv4 loopback — Docker Desktop often hangs on localhost → ::1. */
function normalizeLocalhost(host: string): string {
  return host === "localhost" ? "127.0.0.1" : host;
}

function normalizeDatabaseUrl(url: string): string {
  try {
    // URL parser needs a web scheme; postgres URLs work after a temp swap.
    const parsed = new URL(url.replace(/^postgresql:/i, "http:").replace(/^postgres:/i, "http:"));
    if (parsed.hostname === "localhost") {
      parsed.hostname = "127.0.0.1";
      return parsed
        .toString()
        .replace(/^http:/i, url.startsWith("postgres://") ? "postgres:" : "postgresql:");
    }
  } catch {
    // leave as-is
  }
  return url;
}

// Lazy pool proxy: the web SSR bundle previously crashed at import time
// because Nitro tried to bundle `pg` and produced a stub. Initialising the
// pool eagerly meant the stub was exercised during module evaluation, not
// at request time. The proxy defers the real `new Pool(...)` until the
// first method call, so the web app can import `@tsu-stack/db` without
// opening a connection (and without blowing up if the bundle's pg stub
// is incomplete).
let _pool: Pool | undefined;
let hasLoggedPoolConfig = false;

function getOrCreatePool(): Pool {
  if (!_pool) {
    const config = createPoolConfig();
    _pool = new Pool(config);
    _pool.on("error", (err) => {
      // Idle client errors — log and continue; next checkout opens a new client.
      console.debug("[db] pool client error:", err.message);
    });
    if (!hasLoggedPoolConfig) {
      hasLoggedPoolConfig = true;
      const hostHint =
        "connectionString" in config && typeof config.connectionString === "string"
          ? (() => {
              try {
                return new URL(
                  config.connectionString
                    .replace(/^postgresql:/i, "http:")
                    .replace(/^postgres:/i, "http:")
                ).host;
              } catch {
                return "(url)";
              }
            })()
          : `${config.host}:${config.port}`;
      console.debug(`[db] pool ready → ${hostHint} max=${config.max}`);
    }
  }
  return _pool;
}

export const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    const p = getOrCreatePool();
    const value = Reflect.get(p, prop);
    return typeof value === "function" ? value.bind(p) : value;
  }
});

/**
 * Drop the process pool so the next query opens a fresh one.
 * Use after Docker Desktop network blips leave the pool wedged
 * (`timeout exceeded when trying to connect` with no free clients).
 */
export async function resetDbPool(): Promise<void> {
  const old = _pool;
  _pool = undefined;
  if (old) {
    await old.end().catch(() => undefined);
  }
}

export const db: NodePgDatabase<typeof relations> = drizzlePg({
  client: pool,
  relations
});

/**
 * Request-scoped Drizzle handle (same underlying connection pool).
 *
 * Important: we share the process-wide `pool` singleton. Creating a new
 * `pg.Pool` per request (and calling `pool.end()`) exhausts Postgres
 * connections and can hang Better Auth (e.g. `/auth/sign-in/social`
 * waiting forever on `createVerificationValue`).
 *
 * Repositories use `getDb()` to read the current request's instance from
 * `AsyncLocalStorage` so transactions stay request-scoped.
 */
export type WsDb = NodePgDatabase<typeof relations>;

const dbStorage = new AsyncLocalStorage<{ db: WsDb; pool: Pool }>();

export function createDb(): WsDb {
  // Always share the process pool — never open a disposable Pool per request.
  return drizzlePg({ client: pool, relations });
}

export async function runWithDb<T>(dbInstance: WsDb, fn: () => T | Promise<T>): Promise<T> {
  return dbStorage.run({ db: dbInstance, pool: pool as Pool }, fn);
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
    console.debug(
      "[db] getDb() called outside runWithDb. Falling back to the PG singleton. " +
        "Wrap the request handler with runWithDb(createDb(), ...) for transaction support."
    );
  }

  return db as unknown as WsDb;
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function checkIsDbReady(): Promise<boolean> {
  try {
    await withTimeout(db.execute(sql`SELECT 1`), 4_000, "db ready check");
    return true;
  } catch {
    // Recover from a wedged pool (Docker Desktop blips, leaked clients).
    await resetDbPool();
    try {
      await withTimeout(db.execute(sql`SELECT 1`), 4_000, "db ready check retry");
      return true;
    } catch {
      return false;
    }
  }
}
