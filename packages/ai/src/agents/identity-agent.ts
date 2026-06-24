import { Agent } from "@mastra/core/agent";
import { createAnswerRelevancyScorer, createToxicityScorer } from "@mastra/evals/scorers/prebuilt";
import { z } from "zod";

import { facetKeySchema } from "@tsu-stack/core/identity";
import { ENV_SERVER } from "@tsu-stack/env/server/env";

import { getMastraModel, IDENTITY_AGENT_INSTRUCTIONS } from "#@/lib/prompt-fragments";
import { getIdentityTool, searchIdentityTool } from "#@/tools/identity/index";

const IdentityProposalSchema = z.object({
  key: facetKeySchema,
  proposedValue: z.unknown(),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1)
});

export const IdentityProposalsOutputSchema = z.object({
  proposals: z.array(IdentityProposalSchema)
});
export type IdentityProposalsOutput = z.infer<typeof IdentityProposalsOutputSchema>;

export const identityAgent = new Agent({
  id: "identity-agent",
  name: "Identity Agent",
  instructions: IDENTITY_AGENT_INSTRUCTIONS,
  model: getMastraModel(),
  // `memory` is wired in `packages/ai/src/mastra/index.ts` via
  // `agent.__setMemory(memory)` after the Mastra instance is built. The
  // string-key form (`memory: "default"`) does not work because the
  // @mastra/core agent `getMemory()` does not resolve string keys against
  // the Mastra memory registry.
  tools: {
    getIdentity: getIdentityTool,
    searchIdentity: searchIdentityTool
  },
  // Live evaluation scorers. Both call MASTRA_MODEL as the LLM judge
  // (one extra model invocation per scored turn). Toxicity runs at 100%
  // — cheap and important for user-facing chat. Answer relevancy runs
  // at 50% — cost-balanced QA.
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
