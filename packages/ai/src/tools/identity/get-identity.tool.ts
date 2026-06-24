import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { facetKeySchema, type FacetKey } from "@tsu-stack/core/identity";
import { identityRepository } from "@tsu-stack/db/repositories";

const facetOutputSchema = z.object({
  key: facetKeySchema,
  value: z.unknown(),
  version: z.number().int(),
  updatedAt: z.coerce.date()
});
type FacetOutput = z.infer<typeof facetOutputSchema>;

export const getIdentityTool = createTool({
  id: "get-identity",
  description:
    "Read the current state of every identity facet (headline, bio, focus_log, narrative). Use this when the user asks about who they are, what they focus on, or what their current bio says.",
  inputSchema: z.object({}),
  outputSchema: z.object({
    facets: z.array(facetOutputSchema)
  }),
  execute: async () => {
    const facets = await identityRepository.listFacets();
    const out: FacetOutput[] = facets.map((f) => {
      return {
        key: f.key as FacetKey,
        value: f.value,
        version: f.version,
        updatedAt: f.updatedAt
      };
    });
    return { facets: out };
  }
});
