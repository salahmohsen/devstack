import { D1Store, type D1WorkersConfig } from "@mastra/cloudflare-d1";
import { PgVector } from "@mastra/pg";

import { ENV_SERVER } from "@tsu-stack/env/server/env";

export type D1Database = D1WorkersConfig["binding"];

export function createMastraD1Store(binding: D1Database) {
  return new D1Store({ id: "mastra", binding, tablePrefix: "mastra_" });
}

export function createMastraVectorStore() {
  if (!ENV_SERVER.DATABASE_URL) {
    throw new Error("createMastraVectorStore: DATABASE_URL is not set");
  }
  return new PgVector({
    id: "mastra-vectors",
    connectionString: ENV_SERVER.DATABASE_URL
  });
}
