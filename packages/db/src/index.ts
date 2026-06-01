import { neonConfig } from "@neondatabase/serverless";
import "@tanstack/react-start/server-only";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";

import { ENV_SERVER } from "@tsu-stack/env/server/env";

import { authRelations } from "#@/schema/auth.schema";
import { relations } from "#@/schema/relations";

export * from "drizzle-orm/sql";

neonConfig.webSocketConstructor = WebSocket;

export const db = drizzle(ENV_SERVER.DATABASE_URL, {
  relations: { ...authRelations, ...relations }
});

export async function checkIsDbReady(): Promise<boolean> {
  try {
    await db.execute(sql`SELECT 1`);
    return true;
  } catch {
    return false;
  }
}
