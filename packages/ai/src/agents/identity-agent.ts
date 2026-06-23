import { Agent } from "@mastra/core/agent";
import { z } from "zod";

import { facetKeySchema } from "@tsu-stack/core/identity";

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
  tools: {
    getIdentity: getIdentityTool,
    searchIdentity: searchIdentityTool
  }
});
