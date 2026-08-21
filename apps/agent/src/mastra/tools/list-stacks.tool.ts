import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { createDb, runWithDb, stackRepository } from "@tsu-stack/db";

/**
 * Evidence graph read — list stacks for the tenant.
 *
 * Tenant scope: `userId` is ALWAYS taken from `requestContext` (set by the
 * workflow step / chat handler). Never accept `userId` from tool input.
 */
export const listStacksTool = createTool({
  id: "list-stacks",
  description:
    "List the user's skills / tools / tech (name, type, project count). Use when they say skills, tools I use, tech I know, or what I work with.",
  inputSchema: z.object({
    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .optional()
      .default(20)
      .describe("Max stacks to return (1–20, default 20)")
    // Intentionally no userId — tenant is requestContext only.
  }),
  outputSchema: z.object({
    stacks: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        type: z.string().nullable(),
        confidence: z.string().nullable(),
        projectCount: z.number().int(),
        inPortfolio: z.boolean(),
        featured: z.boolean(),
        alternativeNames: z.array(z.string()),
        summary: z.string().nullable()
      })
    )
  }),
  execute: async ({ limit }, context) => {
    // Force tenant from requestContext — ignore any model-supplied identity.
    const userId = context.requestContext?.get?.("userId") as string | undefined;
    if (!userId) {
      return { stacks: [] };
    }
    const db = createDb();
    const rows = await runWithDb(db, () => stackRepository.findAllByUserId(userId));
    return {
      stacks: rows.slice(0, limit ?? 20).map((r) => {
        return {
          id: r.id,
          name: r.name,
          type: r.type ?? null,
          confidence: r.confidence ?? null,
          projectCount: r.projectCount ?? 0,
          inPortfolio: Boolean(r.portfolioEntryId),
          featured: Boolean(r.isFeatured),
          alternativeNames: r.alternativeNames ?? [],
          // Short text only — omit large description bodies.
          summary: r.description ? r.description.slice(0, 200) : null
        };
      })
    };
  }
});
