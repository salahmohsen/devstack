import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { createDb, educationRepository, runWithDb } from "@tsu-stack/db";

/**
 * Profile read — list education entries for the tenant.
 *
 * Tenant scope: `userId` is ALWAYS taken from `requestContext` (set by the
 * workflow step / chat handler). Never accept `userId` from tool input.
 */
export const listEducationsTool = createTool({
  id: "list-educations",
  description:
    "List the user's education entries (school, degree, field, dates, GPA). Use when they say education, degrees, university, studies, or GPA.",
  inputSchema: z.object({
    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .optional()
      .default(20)
      .describe("Max entries to return (1–20, default 20)")
    // Intentionally no userId — tenant is requestContext only.
  }),
  outputSchema: z.object({
    educations: z.array(
      z.object({
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
    )
  }),
  execute: async ({ limit }, context) => {
    // Force tenant from requestContext — ignore any model-supplied identity.
    const userId = context.requestContext?.get?.("userId") as string | undefined;
    if (!userId) {
      return { educations: [] };
    }
    const db = createDb();
    const rows = await runWithDb(db, () => educationRepository.findAllByUserId(userId));
    return {
      educations: rows.slice(0, limit ?? 20).map((r) => {
        return {
          id: r.id,
          school: r.school,
          degree: r.degree,
          field: r.field ?? null,
          location: r.location ?? null,
          fromDate: r.fromDate ?? null,
          toDate: r.toDate ?? null,
          isPresent: r.isPresent ?? false,
          description: r.description ?? null,
          gpa: r.gpa ?? null
        };
      })
    };
  }
});
