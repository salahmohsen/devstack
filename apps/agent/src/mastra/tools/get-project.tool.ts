import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { createDb, projectRepository, runWithDb } from "@tsu-stack/db";

/**
 * Evidence graph read — single project by id for the current tenant.
 *
 * Tenant scope: `userId` is ALWAYS taken from `requestContext` (set by the
 * workflow step / chat handler). Never accept `userId` from tool input.
 */
export const getProjectTool = createTool({
  id: "get-project",
  description:
    "Fetch one project by id (title, year, summary, stacks, links) for the current user only.",
  inputSchema: z.object({
    projectId: z.string().min(1)
    // Intentionally no userId — tenant is requestContext only.
  }),
  outputSchema: z.object({
    found: z.boolean(),
    project: z
      .object({
        id: z.string(),
        title: z.string(),
        year: z.number().int(),
        summary: z.string().nullable(),
        descriptionSnippet: z.string().nullable(),
        isArchived: z.boolean(),
        isPresent: z.boolean(),
        experienceId: z.string().nullable(),
        demoUrl: z.string().nullable(),
        repos: z.array(z.string()),
        stackNames: z.array(z.string())
      })
      .nullable()
  }),
  execute: async ({ projectId }, context) => {
    // Force tenant from requestContext — ignore any model-supplied identity.
    const userId = context.requestContext?.get?.("userId") as string | undefined;
    if (!userId) {
      return { found: false, project: null };
    }
    const db = createDb();
    const row = await runWithDb(db, () => projectRepository.findByIdForUser(projectId, userId));
    if (!row) return { found: false, project: null };
    return {
      found: true,
      project: {
        id: row.id,
        title: row.title,
        year: row.year,
        summary: row.summary ? row.summary.slice(0, 400) : null,
        // Short snippet only — omit large HTML bodies.
        descriptionSnippet: row.description ? row.description.slice(0, 400) : null,
        isArchived: row.isArchived ?? false,
        isPresent: row.isPresent ?? false,
        experienceId: row.experienceId ?? null,
        demoUrl: row.demoUrl ?? null,
        repos: (row.repos ?? []).slice(0, 10),
        stackNames: (row.stacks ?? [])
          .map((ps) => ps.stack?.name)
          .filter((n): n is string => Boolean(n))
          .slice(0, 20)
      }
    };
  }
});
