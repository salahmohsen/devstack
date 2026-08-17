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
    "Ranked short hits. Omit kind to search projects, experiences, and stacks together (workplace names). Then getProject / getExperience / getStack. Close hits → ask which. Never invent an id.",
  inputSchema: z.object({
    kind: EvidenceKindSchema.optional().describe("Omit to search all three kinds."),
    query: z.string().min(1).describe("Title, org, or name fragment to rank against.")
    // Intentionally no userId — tenant is requestContext only.
  }),
  outputSchema: z.object({
    hits: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        oneLiner: z.string(),
        kind: EvidenceKindSchema
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
      if (kind === "project") {
        return toEvidenceSearchRows("project", await projectRepository.findAllByUserId(userId));
      }
      if (kind === "experience") {
        return toEvidenceSearchRows(
          "experience",
          await experienceRepository.findAllByUserId(userId)
        );
      }
      if (kind === "stack") {
        return toEvidenceSearchRows("stack", await stackRepository.findAllByUserId(userId));
      }
      const [projects, experiences, stacks] = await Promise.all([
        projectRepository.findAllByUserId(userId),
        experienceRepository.findAllByUserId(userId),
        stackRepository.findAllByUserId(userId)
      ]);
      return [
        ...toEvidenceSearchRows("project", projects),
        ...toEvidenceSearchRows("experience", experiences),
        ...toEvidenceSearchRows("stack", stacks)
      ];
    });
    return {
      hits: rankEvidenceHits({ query, rows }).map((hit) => {
        return {
          id: hit.id,
          title: hit.title,
          oneLiner: hit.oneLiner,
          kind: hit.kind ?? kind ?? "project"
        };
      })
    };
  }
});
