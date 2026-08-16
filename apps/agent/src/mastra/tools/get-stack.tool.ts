import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { createDb, runWithDb, stackRepository } from "@tsu-stack/db";

/**
 * Evidence graph read — single stack by id for the current tenant.
 *
 * Tenant scope: `userId` is ALWAYS taken from `requestContext` (set by the
 * workflow step / chat handler). Never accept `userId` from tool input.
 */
export const getStackTool = createTool({
  id: "get-stack",
  description:
    "Fetch one stack by id (name, type, summary, linked project titles) for the current user only.",
  inputSchema: z.object({
    stackId: z.string().min(1).describe("Stack id from listStacks. Required.")
    // Intentionally no userId — tenant is requestContext only.
  }),
  outputSchema: z.object({
    found: z.boolean(),
    stack: z
      .object({
        id: z.string(),
        name: z.string(),
        type: z.string().nullable(),
        confidence: z.string().nullable(),
        summary: z.string().nullable(),
        projects: z.array(
          z.object({
            id: z.string(),
            title: z.string()
          })
        )
      })
      .nullable()
  }),
  execute: async ({ stackId }, context) => {
    // Force tenant from requestContext — ignore any model-supplied identity.
    const userId = context.requestContext?.get?.("userId") as string | undefined;
    if (!userId) {
      return { found: false, stack: null };
    }
    const db = createDb();
    const row = await runWithDb(db, () => stackRepository.findByIdForUser(stackId, userId));
    if (!row) return { found: false, stack: null };
    return {
      found: true,
      stack: {
        id: row.id,
        name: row.name,
        type: row.type ?? null,
        confidence: row.confidence ?? null,
        // Short text only — omit large description bodies.
        summary: row.description ? row.description.slice(0, 400) : null,
        projects: (row.projects ?? [])
          .map((ps) => {
            const p = ps.project;
            if (!p) return null;
            return { id: p.id, title: p.title };
          })
          .filter((p): p is { id: string; title: string } => p != null)
          .slice(0, 20)
      }
    };
  }
});
