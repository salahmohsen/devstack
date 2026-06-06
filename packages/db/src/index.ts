import "@tanstack/react-start/server-only";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";

import { ENV_SERVER } from "@tsu-stack/env/server/env";

import * as schema from "#@/schema/index";
import { relations as appRelations } from "#@/schema/relations";

export * from "drizzle-orm/sql";

const { relations: authRelations } = schema;

export const db = drizzle(ENV_SERVER.DATABASE_URL, {
  relations: { ...authRelations, ...appRelations }
});

export async function checkIsDbReady(): Promise<boolean> {
  try {
    await db.execute(sql`SELECT 1`);
    return true;
  } catch {
    return false;
  }
}
