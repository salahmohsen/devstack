import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { createDb, experienceRepository, runWithDb } from "@tsu-stack/db";

/**
 * Evidence graph read — list experiences for the tenant.
 *
 * Tenant scope: `userId` is ALWAYS taken from `requestContext` (set by the
 * workflow step / chat handler). Never accept `userId` from tool input.
 */
export const listExperiencesTool = createTool({
  id: "list-experiences",
  description:
    "List the user's work history (title, organization, dates). Use when they say past jobs, companies I worked at, resume jobs, or work history.",
  inputSchema: z.object({
    limit: z.number().int().min(1).max(20).optional().default(20)
    // Intentionally no userId — tenant is requestContext only.
  }),
  outputSchema: z.object({
    experiences: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        organization: z.string(),
        fromDate: z.string().nullable(),
        toDate: z.string().nullable(),
        isPresent: z.boolean(),
        summary: z.string().nullable(),
        projectCount: z.number().int()
      })
    )
  }),
  execute: async ({ limit }, context) => {
    // Force tenant from requestContext — ignore any model-supplied identity.
    const userId = context.requestContext?.get?.("userId") as string | undefined;
    if (!userId) {
      return { experiences: [] };
    }
    const db = createDb();
    const rows = await runWithDb(db, () => experienceRepository.findAllByUserId(userId));
    return {
      experiences: rows.slice(0, limit ?? 20).map((r) => {
        return {
          id: r.id,
          title: r.title,
          organization: r.organization,
          fromDate: r.fromDate ?? null,
          toDate: r.toDate ?? null,
          isPresent: r.isPresent ?? false,
          // Short text only — omit large HTML bodies.
          summary: r.description ? r.description.slice(0, 200) : null,
          projectCount: r.projects?.length ?? 0
        };
      })
    };
  }
});
