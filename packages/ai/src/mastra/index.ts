import { Mastra } from "@mastra/core";
import { InMemoryStore, MastraCompositeStore } from "@mastra/core/storage";

import { ENV_SERVER } from "@tsu-stack/env/server/env";

import { identityAgent } from "#@/agents/identity-agent";
import { portfolioAgent } from "#@/agents/portfolio-agent";
import { DisabledNetlifyGateway } from "#@/mastra/disabled-netlify-gateway";
import { createMastraMemory, type D1Database } from "#@/memory/index";
import { createMastraD1Store, createMastraVectorStore } from "#@/memory/storage";
import { observability } from "#@/observability";
import {
  fetchRepoContextTool,
  fetchRepoReadmeTool,
  getIdentityTool,
  listRecentCommitsTool,
  searchIdentityTool,
  updateIdentityFacetTool
} from "#@/tools/index";
import { refreshIdentityWorkflow } from "#@/workflows/refresh-identity/index";

export { mountMastra } from "#@/mastra/server-adapter";
export { orpcContextStorage } from "#@/lib/orpc-context-storage";
export type { D1Database } from "#@/memory/index";

type MastraEnv = { MASTRA_DB: D1Database };

let cachedMastra: { env: MastraEnv; instance: Mastra } | undefined;

export async function createMastra(env: MastraEnv): Promise<Mastra> {
  // Build the per-binding Memory instance once and share it between the
  // Mastra instance and the agents. The @mastra/core agent `getMemory()`
  // does not resolve string keys against `mastramemory[...]`; passing the
  // string `"default"` to the agent causes the next call to fail with
  // `TypeError: resolvedMemory.__registerMastra is not a function`.
  // Setting the instance directly via `__setMemory` works because
  // `getMemory()` then sees a real Memory object.
  const memory = createMastraMemory(env.MASTRA_DB);

  // D1 is a relational store and does not support the OLAP-style
  // observability domain that `MastraStorageExporter` writes to. When
  // `MASTRA_LOCAL_METRICS_ENABLED=true` (dev only) we wrap the D1 store
  // in a `MastraCompositeStore` that routes the `observability` domain
  // to an `InMemoryStore`, so the local Studio at `MASTRA_STUDIO_URL`
  // can read metrics. InMemoryStore is wiped on every dev restart
  // (workerd reinitialises the module on HMR); that's acceptable for
  // local dev and never enabled in production. See
  // `docs/dev/mastra-studio.md` §"Local Studio metrics".
  const d1Store = createMastraD1Store(env.MASTRA_DB);
  const storage = ENV_SERVER.MASTRA_LOCAL_METRICS_ENABLED
    ? new MastraCompositeStore({
        id: "mastra",
        default: d1Store,
        domains: {
          observability: await new InMemoryStore({
            id: "observability"
          }).getStore("observability")
        }
      })
    : d1Store;

  const mastra = new Mastra({
    memory: { default: memory },
    // Register a no-op gateway with id `"netlify"` to suppress the default
    // Netlify AI Gateway that ships with @mastra/core. The constructor
    // skips default gateways with the same id as a custom one, and the
    // builder/models/available route only calls `fetchProviders()` on
    // registered gateways — so the Netlify HTTP call is never made. See
    // `disabled-netlify-gateway.ts` for the full rationale. See plan #27.
    gateways: {
      netlify: new DisabledNetlifyGateway()
    },
    storage,
    observability,
    // The vector store is registered under its `id` ("mastra-vectors") so
    // createVectorQueryTool(..., { vectorStoreName: "mastra-vectors" }) can
    // resolve it via mastra.getVector("mastra-vectors") at tool-execution
    // time. The memory instance shares the same store for its own
    // semantic-recall writes.
    vectors: { "mastra-vectors": createMastraVectorStore() },
    tools: {
      getIdentity: getIdentityTool,
      searchIdentity: searchIdentityTool,
      updateIdentityFacet: updateIdentityFacetTool,
      fetchRepoReadme: fetchRepoReadmeTool,
      fetchRepoContext: fetchRepoContextTool,
      listRecentCommits: listRecentCommitsTool
    },
    agents: {
      identityAgent,
      portfolioAgent
    },
    workflows: {
      "refresh-identity": refreshIdentityWorkflow
    }
  });

  // `identityAgent` and `portfolioAgent` are module-level singletons
  // (imported above), so they couldn't take a `memory` argument at
  // construction time without restructuring. Setting it after the Mastra
  // instance exists wires them to the same Memory instance the Mastra
  // registry holds.
  identityAgent.__setMemory(memory);
  portfolioAgent.__setMemory(memory);

  return mastra;
}

export async function getMastra(env: MastraEnv): Promise<Mastra> {
  if (!cachedMastra || cachedMastra.env.MASTRA_DB !== env.MASTRA_DB) {
    cachedMastra = { env, instance: await createMastra(env) };
  }
  return cachedMastra.instance;
}
