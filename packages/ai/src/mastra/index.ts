import { Mastra } from "@mastra/core";

import { identityAgent } from "#@/agents/identity-agent";
import { portfolioAgent } from "#@/agents/portfolio-agent";
import { createMastraMemory, type D1Database } from "#@/memory/index";
import { createMastraVectorStore } from "#@/memory/storage";
import { observability } from "#@/observability";
import {
  fetchRepoContextTool,
  fetchRepoReadmeTool,
  getIdentityTool,
  listRecentCommitsTool,
  searchIdentityTool,
  updateIdentityFacetTool
} from "#@/tools/index";

export { mountMastra } from "./server-adapter";
export type { D1Database } from "#@/memory/index";

type MastraEnv = { MASTRA_DB: D1Database };

export function createMastra(env: MastraEnv): Mastra {
  return new Mastra({
    memory: { default: createMastraMemory(env.MASTRA_DB) },
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
    }
  });
}
