import { join } from "node:path";

import { migrate } from "drizzle-orm/neon-serverless/migrator";

import { db } from "#@/index";

export async function migrateDatabase(): Promise<void> {
  await migrate(db, {
    migrationsFolder: join(import.meta.dirname, "migrations")
  });
}
