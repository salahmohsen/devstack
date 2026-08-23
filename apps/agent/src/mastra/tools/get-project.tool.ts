import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { createDb, projectRepository, runWithDb } from "@tsu-stack/db";

function headingsFromAnalysis(analysis: string): string[] {
  const headings: string[] = [];
  for (const match of analysis.matchAll(/^#{1,3}\s+(.+)$/gm)) {
    const heading = match[1]?.trim() ?? "";
    if (!heading) continue;
    headings.push(heading);
    if (headings.length >= 16) break;
  }
  return headings;
}

/**
 * Evidence graph read — single project by id for the current tenant.
 *
 * Tenant scope: `userId` is ALWAYS taken from `requestContext` (set by the
 * workflow step / chat handler). Never accept `userId` from tool input.
 */
export const getProjectTool = createTool({
  id: "get-project",
  description:
    "Fetch one project by id (title, year, full summary, description, and analysis, stacks, links). Required: projectId or id from listProjects / searchEvidence. Read analysis before rewriting summary or description — do not invent copy. Never dump analysis in chat. Do not patch analysis. Never call with {} or a missing id.",
  inputSchema: z.object({
    projectId: z
      .string()
      .min(1)
      .optional()
      .describe("Project id from listProjects / searchEvidence."),
    id: z.string().min(1).optional().describe("Alias for projectId.")
    // Intentionally no userId — tenant is requestContext only.
  }),
  outputSchema: z.object({
    found: z.boolean(),
    error: z.string().optional(),
    project: z
      .object({
        id: z.string(),
        title: z.string(),
        year: z.number().int(),
        summary: z.string().nullable(),
        description: z.string().nullable(),
        analysis: z.string().nullable(),
        hasAnalysis: z.boolean(),
        analysisHeadings: z.array(z.string()),
        isArchived: z.boolean(),
        isPresent: z.boolean(),
        experienceId: z.string().nullable(),
        demoUrl: z.string().nullable(),
        repos: z.array(z.string()),
        stackNames: z.array(z.string())
      })
      .nullable()
  }),
  execute: async ({ projectId, id }, context) => {
    const resolvedId = (projectId ?? id ?? "").trim();
    if (!resolvedId) {
      return {
        found: false,
        project: null,
        error: "projectId is required. Call listProjects first and pass one of the returned ids."
      };
    }
    // Force tenant from requestContext — ignore any model-supplied identity.
    const userId = context.requestContext?.get?.("userId") as string | undefined;
    if (!userId) {
      return { found: false, project: null };
    }
    const db = createDb();
    const row = await runWithDb(db, () => projectRepository.findByIdForUser(resolvedId, userId));
    if (!row) return { found: false, project: null };
    const analysisRaw = row.analysis?.trim() ?? "";
    return {
      found: true,
      project: {
        id: row.id,
        title: row.title,
        year: row.year,
        summary: row.summary ?? null,
        description: row.description ?? null,
        analysis: analysisRaw.length > 0 ? analysisRaw : null,
        hasAnalysis: analysisRaw.length > 0,
        analysisHeadings: headingsFromAnalysis(analysisRaw),
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
