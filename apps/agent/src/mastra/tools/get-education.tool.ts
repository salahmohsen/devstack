import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { createDb, educationRepository, runWithDb } from "@tsu-stack/db";

/**
 * Profile read — single education entry by id for the current tenant.
 *
 * Tenant scope: `userId` is ALWAYS taken from `requestContext` (set by the
 * workflow step / chat handler). Never accept `userId` from tool input.
 */
export const getEducationTool = createTool({
  id: "get-education",
  description:
    "Fetch one education entry by id (school, degree, field, dates, GPA, description) for the current user only.",
  inputSchema: z.object({
    educationId: z.string().min(1).describe("Education id from listEducations. Required.")
    // Intentionally no userId — tenant is requestContext only.
  }),
  outputSchema: z.object({
    found: z.boolean(),
    education: z
      .object({
        id: z.string(),
        school: z.string(),
        degree: z.string(),
        field: z.string().nullable(),
        location: z.string().nullable(),
        fromDate: z.string().nullable(),
        toDate: z.string().nullable(),
        isPresent: z.boolean(),
        description: z.string().nullable(),
        gpa: z.string().nullable()
      })
      .nullable()
  }),
  execute: async ({ educationId }, context) => {
    // Force tenant from requestContext — ignore any model-supplied identity.
    const userId = context.requestContext?.get?.("userId") as string | undefined;
    if (!userId) {
      return { found: false, education: null };
    }
    const db = createDb();
    const row = await runWithDb(db, () => educationRepository.findByIdForUser(educationId, userId));
    if (!row) return { found: false, education: null };
    return {
      found: true,
      education: {
        id: row.id,
        school: row.school,
        degree: row.degree,
        field: row.field ?? null,
        location: row.location ?? null,
        fromDate: row.fromDate ?? null,
        toDate: row.toDate ?? null,
        isPresent: row.isPresent ?? false,
        description: row.description ?? null,
        gpa: row.gpa ?? null
      }
    };
  }
});
