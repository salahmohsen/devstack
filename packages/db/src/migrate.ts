import { join } from "node:path";

import { migrate } from "drizzle-orm/node-postgres/migrator";

import { db } from "./index.ts";

export async function migrateDatabase(): Promise<void> {
  await migrate(db, {
    migrationsFolder: join(import.meta.dirname, "migrations")
  });
}
