import { Mastra } from "@mastra/core";

import { createMastraMemory, type D1Database } from "#@/memory/index";
import { observability } from "#@/observability";

export { mountMastra } from "./server-adapter";
export type { D1Database } from "#@/memory/index";

type MastraEnv = { MASTRA_DB: D1Database };

export function createMastra(env: MastraEnv): Mastra {
  return new Mastra({
    memory: { default: createMastraMemory(env.MASTRA_DB) },
    observability
  });
}
