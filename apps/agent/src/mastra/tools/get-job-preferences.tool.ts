import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { createDb, jobPreferenceRepository, runWithDb } from "@tsu-stack/db";

/**
 * Evidence / prefs read — job preferences for the current tenant.
 *
 * Tenant scope: `userId` is ALWAYS taken from `requestContext` (set by the
 * workflow step / chat handler). Never accept `userId` from tool input.
 */
export const getJobPreferencesTool = createTool({
  id: "get-job-preferences",
  description:
    "Fetch what the user is looking for (job preferences). workModes is a multi-select array (remote|hybrid|onsite; empty = any mode). Also role keywords, salary floor, min match score. Use for 'what jobs do I want', fit questions, or JD propose. If role keywords are empty, also call listExperiences + listStacks + listProjects — New jobs are filtered by that profile, not only this row.",
  inputSchema: z
    .object({})
    .describe("No arguments. Tenant is the session user — do not pass userId."),
  outputSchema: z.object({
    found: z.boolean(),
    preferences: z
      .object({
        id: z.string(),
        /** Multi-select preferred work modes (OR). Empty = no work-mode filter. */
        workModes: z.array(z.enum(["remote", "hybrid", "onsite"])),
        roleKeywords: z.array(z.string()),
        salaryMin: z.number().nullable(),
        salaryCurrency: z.string().nullable(),
        minMatchScore: z.number().int(),
        dailyBoardScoreCap: z.number().int(),
        importFromEmail: z.boolean(),
        reviewApplyKit: z.boolean()
      })
      .nullable()
  }),
  execute: async (_input, context) => {
    // Force tenant from requestContext — ignore any model-supplied identity.
    const userId = context.requestContext?.get?.("userId") as string | undefined;
    if (!userId) {
      return { found: false, preferences: null };
    }
    const db = createDb();
    const row = await runWithDb(db, () => jobPreferenceRepository.findByUserId(userId));
    if (!row) return { found: false, preferences: null };
    return {
      found: true,
      preferences: {
        id: row.id,
        workModes: row.workModes ?? [],
        roleKeywords: row.roleKeywords ?? [],
        salaryMin: row.salaryMin ?? null,
        salaryCurrency: row.salaryCurrency ?? null,
        minMatchScore: row.minMatchScore,
        dailyBoardScoreCap: row.dailyBoardScoreCap ?? 50,
        importFromEmail: row.importFromEmail ?? false,
        reviewApplyKit: row.reviewApplyKit ?? true
      }
    };
  }
});
