import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { createDb, experienceRepository, runWithDb } from "@tsu-stack/db";

/**
 * Evidence graph read — single experience by id for the current tenant.
 *
 * Tenant scope: `userId` is ALWAYS taken from `requestContext` (set by the
 * workflow step / chat handler). Never accept `userId` from tool input.
 */
export const getExperienceTool = createTool({
  id: "get-experience",
  description:
    "Fetch one experience by id (role, org, dates, summary, linked project titles) for the current user only.",
  inputSchema: z.object({
    experienceId: z.string().min(1).describe("Experience id from listExperiences. Required.")
    // Intentionally no userId — tenant is requestContext only.
  }),
  outputSchema: z.object({
    found: z.boolean(),
    experience: z
      .object({
        id: z.string(),
        title: z.string(),
        organization: z.string(),
        fromDate: z.string().nullable(),
        toDate: z.string().nullable(),
        isPresent: z.boolean(),
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
  execute: async ({ experienceId }, context) => {
    // Force tenant from requestContext — ignore any model-supplied identity.
    const userId = context.requestContext?.get?.("userId") as string | undefined;
    if (!userId) {
      return { found: false, experience: null };
    }
    const db = createDb();
    const row = await runWithDb(db, () =>
      experienceRepository.findByIdForUser(experienceId, userId)
    );
    if (!row) return { found: false, experience: null };
    return {
      found: true,
      experience: {
        id: row.id,
        title: row.title,
        organization: row.organization,
        fromDate: row.fromDate ?? null,
        toDate: row.toDate ?? null,
        isPresent: row.isPresent ?? false,
        summary: row.description ?? null,
        projects: (row.projects ?? []).slice(0, 20).map((p) => {
          return { id: p.id, title: p.title };
        })
      }
    };
  }
});
