import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { createDb, projectRepository, runWithDb } from "@tsu-stack/db";

/**
 * Evidence graph read — list projects for the tenant.
 *
 * Tenant scope: `userId` is ALWAYS taken from `requestContext` (set by the
 * workflow step / chat handler). Never accept `userId` from tool input.
 */
export const listProjectsTool = createTool({
  id: "list-projects",
  description:
    "List things the user built (title, year, summary, hasAnalysis, stackNames). Use when they say side projects, portfolio projects, or things I built. Call getProject before rewriting one — analysis lives there. Do not getProject every row.",
  inputSchema: z.object({
    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .optional()
      .default(20)
      .describe("Max projects to return (1–20, default 20)")
    // Intentionally no userId — tenant is requestContext only.
  }),
  outputSchema: z.object({
    projects: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        year: z.number().int(),
        summary: z.string().nullable(),
        hasAnalysis: z.boolean(),
        isArchived: z.boolean(),
        isPresent: z.boolean(),
        experienceId: z.string().nullable(),
        stackNames: z.array(z.string())
      })
    )
  }),
  execute: async ({ limit }, context) => {
    // Force tenant from requestContext — ignore any model-supplied identity.
    const userId = context.requestContext?.get?.("userId") as string | undefined;
    if (!userId) {
      return { projects: [] };
    }
    const db = createDb();
    const rows = await runWithDb(db, () => projectRepository.findAllByUserId(userId));
    return {
      projects: rows.slice(0, limit ?? 20).map((r) => {
        return {
          id: r.id,
          title: r.title,
          year: r.year,
          // Prefer short summary; never return full HTML description.
          summary: r.summary ? r.summary.slice(0, 200) : null,
          hasAnalysis: Boolean(r.analysis?.trim()),
          isArchived: r.isArchived ?? false,
          isPresent: r.isPresent ?? false,
          experienceId: r.experienceId ?? null,
          stackNames: (r.stacks ?? [])
            .map((ps) => ps.stack?.name)
            .filter((n): n is string => Boolean(n))
            .slice(0, 12)
        };
      })
    };
  }
});
