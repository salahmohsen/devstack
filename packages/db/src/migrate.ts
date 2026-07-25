import { join } from "node:path";

import { migrate } from "drizzle-orm/node-postgres/migrator";

import { db } from "./index.ts";

/**
 * Apply pending Drizzle migrations.
 *
 * Folder resolution order:
 * 1. `MIGRATIONS_FOLDER` env (Docker sets this to the copied migrations path)
 * 2. `packages/db/migrations` next to this source file (`../migrations`)
 */
export async function migrateDatabase(folder?: string): Promise<void> {
  const migrationsFolder =
    folder ?? process.env.MIGRATIONS_FOLDER ?? join(import.meta.dirname, "..", "migrations");

  await migrate(db, { migrationsFolder });
}
