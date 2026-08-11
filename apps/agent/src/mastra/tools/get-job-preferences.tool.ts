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
    "Fetch the seeker's job preferences (work modes, locations, role keywords, salary floor, min match score). Use when proposing applications from a JD.",
  inputSchema: z.object({
    // Intentionally empty — tenant is requestContext only; one prefs row per user.
  }),
  outputSchema: z.object({
    found: z.boolean(),
    preferences: z
      .object({
        id: z.string(),
        workModes: z.array(z.string()),
        locations: z.array(z.string()),
        roleKeywords: z.array(z.string()),
        excludeKeywords: z.array(z.string()),
        salaryMin: z.number().nullable(),
        salaryCurrency: z.string().nullable(),
        minMatchScore: z.number().int()
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
        locations: row.locations ?? [],
        roleKeywords: row.roleKeywords ?? [],
        excludeKeywords: row.excludeKeywords ?? [],
        salaryMin: row.salaryMin ?? null,
        salaryCurrency: row.salaryCurrency ?? null,
        minMatchScore: row.minMatchScore
      }
    };
  }
});
