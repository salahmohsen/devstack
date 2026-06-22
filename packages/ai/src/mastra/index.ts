import { Mastra } from "@mastra/core";

import { createMastraMemory, type D1Database } from "#@/memory/index";
import { observability } from "#@/observability";

type Env = { MASTRA_DB: D1Database };

let _mastra: Mastra | null = null;

export function getMastra(env: Env): Mastra {
  if (_mastra) return _mastra;
  _mastra = new Mastra({
    memory: { default: createMastraMemory(env.MASTRA_DB) },
    observability
  });
  return _mastra;
}

// For backwards compat with the Task 1 scaffold (mountMastra was importing
// the const directly). Will be removed once consumers use getMastra(env).
export const mastra = new Proxy({} as Mastra, {
  get(_target, prop) {
    throw new Error(
      `mastra.${String(prop)} called before getMastra(env); use getMastra(env) instead`
    );
  }
}) as unknown as Mastra;
