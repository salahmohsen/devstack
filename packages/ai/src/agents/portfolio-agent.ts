import { Agent } from "@mastra/core/agent";
import { createAnswerRelevancyScorer, createToxicityScorer } from "@mastra/evals/scorers/prebuilt";

import { ENV_SERVER } from "@tsu-stack/env/server/env";

import { getMastraModel, PORTFOLIO_AGENT_INSTRUCTIONS } from "#@/lib/prompt-fragments";
import {
  fetchRepoContextTool,
  fetchRepoReadmeTool,
  listRecentCommitsTool
} from "#@/tools/github/index";
import {
  getIdentityTool,
  searchIdentityTool,
  updateIdentityFacetTool
} from "#@/tools/identity/index";

export const portfolioAgent = new Agent({
  id: "portfolio-agent",
  name: "Portfolio Agent",
  instructions: PORTFOLIO_AGENT_INSTRUCTIONS,
  model: getMastraModel(),
  // `memory` is wired in `packages/ai/src/mastra/index.ts` via
  // `agent.__setMemory(memory)` after the Mastra instance is built. See
  // the matching comment in `identity-agent.ts` for why the string-key
  // form does not work.
  tools: {
    getIdentity: getIdentityTool,
    searchIdentity: searchIdentityTool,
    updateIdentityFacet: updateIdentityFacetTool,
    fetchRepoReadme: fetchRepoReadmeTool,
    fetchRepoContext: fetchRepoContextTool,
    listRecentCommits: listRecentCommitsTool
  },
  // See `identity-agent.ts` for sampling rationale.
  scorers: {
    toxicity: {
      scorer: createToxicityScorer({ model: ENV_SERVER.MASTRA_MODEL }),
      sampling: { type: "ratio", rate: 1 }
    },
    answerRelevancy: {
      scorer: createAnswerRelevancyScorer({ model: ENV_SERVER.MASTRA_MODEL }),
      sampling: { type: "ratio", rate: 0.5 }
    }
  }
});
