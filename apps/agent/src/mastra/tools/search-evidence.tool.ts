import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { EvidenceKindSchema, rankEvidenceHits } from "@tsu-stack/core";
import {
  createDb,
  experienceRepository,
  projectRepository,
  runWithDb,
  stackRepository
} from "@tsu-stack/db";

import { toEvidenceSearchRows } from "#@/mastra/lib/search-evidence-rows";

/**
 * Evidence graph search — ranked short hits for one kind.
 *
 * Tenant scope: `userId` is ALWAYS taken from `requestContext` (set by the
 * workflow step / chat handler). Never accept `userId` from tool input.
 */
export const searchEvidenceTool = createTool({
  id: "search-evidence",
  description:
    "Ranked short hits. Then getProject / getExperience / getStack. Close hits → ask which. Never invent an id.",
  inputSchema: z.object({
    kind: EvidenceKindSchema,
    query: z.string().min(1).describe("Title, org, or name fragment to rank against.")
    // Intentionally no userId — tenant is requestContext only.
  }),
  outputSchema: z.object({
    hits: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        oneLiner: z.string()
      })
    )
  }),
  execute: async ({ kind, query }, context) => {
    // Force tenant from requestContext — ignore any model-supplied identity.
    const userId = context.requestContext?.get?.("userId") as string | undefined;
    if (!userId) {
      return { hits: [] };
    }
    const db = createDb();
    const rows = await runWithDb(db, async () => {
      switch (kind) {
        case "project":
          return toEvidenceSearchRows("project", await projectRepository.findAllByUserId(userId));
        case "experience":
          return toEvidenceSearchRows(
            "experience",
            await experienceRepository.findAllByUserId(userId)
          );
        case "stack":
          return toEvidenceSearchRows("stack", await stackRepository.findAllByUserId(userId));
      }
    });
    return { hits: rankEvidenceHits({ query, rows }) };
  }
});
