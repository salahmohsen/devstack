import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { identityRepository } from "@tsu-stack/db/repositories";

import { renderIdentityToWorkingMemory } from "#@/lib/bridge";
import { shouldAutoWrite } from "#@/lib/confidence";

const ProposalSchema = z.object({
  key: z.enum(["headline", "bio", "focus_log", "narrative"]),
  proposedValue: z.unknown(),
  confidence: z.number().min(0).max(1),
  reason: z.string()
});

export const writeFacetsStep = createStep({
  id: "write-facets",
  inputSchema: z.object({
    commitSha: z.string().optional(),
    reason: z.string(),
    currentFacets: z.record(z.string(), z.unknown()),
    proposals: z.array(ProposalSchema)
  }),
  outputSchema: z.object({
    applied: z.array(z.string()),
    queued: z.array(z.string())
  }),
  execute: async ({ inputData, mastra, requestContext }) => {
    const resourceId = (requestContext?.get?.("resourceId") as string | undefined) ?? "system";

    const applied: string[] = [];
    const queued: string[] = [];

    for (const proposal of inputData.proposals) {
      if (shouldAutoWrite(proposal.confidence)) {
        await identityRepository.writeFacet({
          key: proposal.key,
          value: proposal.proposedValue,
          source: "github",
          sourceRef: inputData.commitSha ?? null,
          reason: `refresh-identity: ${proposal.reason}`,
          actor: `agent:${resourceId}`
        });
        applied.push(proposal.key);
      } else {
        await identityRepository.createProposal({
          facetKey: proposal.key,
          proposedValue: proposal.proposedValue,
          currentValue: inputData.currentFacets[proposal.key] ?? null,
          confidence: proposal.confidence,
          reason: proposal.reason,
          source: "github",
          sourceRef: inputData.commitSha ?? null
        });
        queued.push(proposal.key);
      }
    }

    // Re-render working memory once at the end (cheaper than per-proposal).
    // The memory instance is registered under the "default" key in
    // `packages/ai/src/mastra/index.ts`. The bridge takes `{ resourceId,
    // threadId }` per the post-Task-5 signature; the auto-write path has no
    // real chat yet, so we use a sentinel thread id. The bridge writes the
    // rendered markdown to working memory scoped to `resourceId`.
    if (applied.length > 0) {
      const memory = mastra.getMemory("default");
      if (memory) {
        await renderIdentityToWorkingMemory(memory, {
          resourceId,
          threadId: "refresh-identity"
        });
      }
    }

    return { applied, queued };
  }
});
