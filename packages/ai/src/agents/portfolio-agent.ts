import { Agent } from "@mastra/core/agent";

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
  tools: {
    getIdentity: getIdentityTool,
    searchIdentity: searchIdentityTool,
    updateIdentityFacet: updateIdentityFacetTool,
    fetchRepoReadme: fetchRepoReadmeTool,
    fetchRepoContext: fetchRepoContextTool,
    listRecentCommits: listRecentCommitsTool
  }
});
