import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import {
  facetKeySchema,
  portfolioIdentitySourceSchema,
  validateFacetValue
} from "@tsu-stack/core/identity";
import { identityRepository } from "@tsu-stack/db/repositories";

export const updateIdentityFacetTool = createTool({
  id: "update-identity-facet",
  description:
    "Write a new value to one identity facet. Validates against the facet's Zod schema before writing. Use when the user explicitly asks to change their bio, focus, headline, or narrative. Do not call this for agent-internal reasoning — the refresh workflow has its own write path.",
  inputSchema: z.object({
    key: facetKeySchema,
    value: z.unknown(),
    source: portfolioIdentitySourceSchema.optional().default("conversation"),
    sourceRef: z.string().nullable().optional().default(null),
    reason: z.string().min(1)
  }),
  outputSchema: z.object({
    facetKey: facetKeySchema,
    version: z.number().int()
  }),
  execute: async (input, context) => {
    const value = validateFacetValue(input.key, input.value);

    const actor = (context.requestContext?.get?.("resourceId") as string | undefined) ?? "agent";

    const { facet } = await identityRepository.writeFacet({
      key: input.key,
      value,
      source: input.source ?? "conversation",
      sourceRef: input.sourceRef ?? null,
      reason: input.reason,
      actor
    });

    return { facetKey: facet.key, version: facet.version };
  }
});
