import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { migrate } from "drizzle-orm/node-postgres/migrator";

import { db, pool } from "./index.ts";

type LocalMigration = {
  name: string;
  hash: string;
  folderMillis: number;
};

/**
 * Folder timestamp prefix `YYYYMMDDHHmmss` → UTC millis.
 * Mirrors drizzle-orm's `formatToMillis` (used for `created_at` / matching).
 */
function formatToMillis(dateStr: string): number {
  const year = Number.parseInt(dateStr.slice(0, 4), 10);
  const month = Number.parseInt(dateStr.slice(4, 6), 10) - 1;
  const day = Number.parseInt(dateStr.slice(6, 8), 10);
  const hour = Number.parseInt(dateStr.slice(8, 10), 10);
  const minute = Number.parseInt(dateStr.slice(10, 12), 10);
  const second = Number.parseInt(dateStr.slice(12, 14), 10);
  return Date.UTC(year, month, day, hour, minute, second);
}

/**
 * Same discovery rules as drizzle-orm's `readMigrationFiles` (folder layout,
 * no legacy `meta/_journal.json`).
 */
function readLocalMigrations(migrationsFolder: string): LocalMigration[] {
  if (existsSync(join(migrationsFolder, "meta/_journal.json"))) {
    throw new Error(
      'Old drizzle-kit migration journal detected (meta/_journal.json). Run "drizzle-kit up" first.'
    );
  }

  const entries = readdirSync(migrationsFolder)
    .map((subdir) => {
      return {
        name: subdir,
        path: join(migrationsFolder, subdir, "migration.sql")
      };
    })
    .filter((it) => existsSync(it.path))
    .toSorted((a, b) => a.name.localeCompare(b.name));

  return entries.map((entry) => {
    const query = readFileSync(entry.path, "utf8");
    const migrationDate = entry.name.slice(0, 14);
    return {
      name: entry.name,
      hash: createHash("sha256").update(query).digest("hex"),
      folderMillis: formatToMillis(migrationDate)
    };
  });
}

function isJournalMismatchError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("do not match any local migration") ||
    message.includes("missing from the local environment")
  );
}

/**
 * Rebuild `drizzle.__drizzle_migrations` so it matches the local folder
 * migrations Drizzle v1 expects.
 *
 * Context: the volume still has a legacy journal (id/hash/created_at only)
 * whose hashes/`created_at` values no longer match rewritten folder migrations
 * (deleted/renamed history). Drizzle's `upgradeIfNeeded` then refuses to start.
 *
 * We do NOT re-run SQL for migrations already counted as applied. Application
 * order is preserved: the first N local migrations (by folder name) are marked
 * applied when the DB had N journal rows; any newer local folders stay pending
 * and are applied by the subsequent `migrate()` call.
 */
async function repairMigrationsJournal(migrationsFolder: string): Promise<void> {
  const local = readLocalMigrations(migrationsFolder);
  if (local.length === 0) {
    throw new Error(`[db] No local migrations found in ${migrationsFolder}`);
  }

  const tableExists = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.tables
       WHERE table_schema = 'drizzle'
         AND table_name = '__drizzle_migrations'
     ) AS exists`
  );

  let appliedCount = 0;
  if (tableExists.rows[0]?.exists) {
    const countResult = await pool.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM drizzle.__drizzle_migrations`
    );
    appliedCount = Number.parseInt(countResult.rows[0]?.n ?? "0", 10);
  }

  const markApplied = Math.min(Math.max(appliedCount, 0), local.length);
  const pending = local.length - markApplied;

  console.warn(
    `[db] Repairing drizzle.__drizzle_migrations: ` +
      `${markApplied} local migration(s) marked applied, ${pending} pending ` +
      `(from ${appliedCount} prior journal row(s), ${local.length} local file(s))`
  );

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`CREATE SCHEMA IF NOT EXISTS drizzle`);
    await client.query(`DROP TABLE IF EXISTS drizzle.__drizzle_migrations`);
    await client.query(`
      CREATE TABLE drizzle.__drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint,
        name text,
        applied_at timestamp with time zone DEFAULT now()
      )
    `);

    for (const migration of local.slice(0, markApplied)) {
      await client.query(
        `INSERT INTO drizzle.__drizzle_migrations (hash, created_at, name, applied_at)
         VALUES ($1, $2, $3, now())`,
        [migration.hash, migration.folderMillis, migration.name]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Apply pending Drizzle migrations.
 *
 * Folder resolution order:
 * 1. `MIGRATIONS_FOLDER` env (Docker sets this to the copied migrations path)
 * 2. `packages/db/migrations` next to this source file (`../migrations`)
 *
 * On Drizzle v1 journal upgrade failures (rewritten migration history),
 * rebuilds the journal from local files then retries once.
 */
export async function migrateDatabase(folder?: string): Promise<void> {
  const migrationsFolder =
    folder ?? process.env.MIGRATIONS_FOLDER ?? join(import.meta.dirname, "..", "migrations");

  try {
    await migrate(db, { migrationsFolder });
  } catch (error) {
    if (!isJournalMismatchError(error)) {
      throw error;
    }

    console.warn(
      "[db] Drizzle migration journal does not match local files; " +
        "rebasing journal metadata (schema SQL not re-executed for already-counted rows)"
    );
    await repairMigrationsJournal(migrationsFolder);
    await migrate(db, { migrationsFolder });
  }
}
