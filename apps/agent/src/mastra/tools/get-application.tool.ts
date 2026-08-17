import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { applicationRepository, createDb, runWithDb } from "@tsu-stack/db";

/**
 * CRM read tool — single application by id for the current tenant.
 *
 * Tenant scope: `userId` is ALWAYS taken from `requestContext` (set by the
 * workflow step / chat handler). Never accept `userId` from tool input.
 */
export const getApplicationTool = createTool({
  id: "get-application",
  description:
    "Fetch one application by id (company, title, stage, location, notes snippet) for the current user only.",
  inputSchema: z.object({
    applicationId: z
      .string()
      .min(1)
      .optional()
      .describe("Application id from searchApplications, listNewJobs, or listOpenApplications"),
    id: z.string().min(1).optional().describe("Alias for applicationId.")
    // Intentionally no userId — tenant is requestContext only.
  }),
  outputSchema: z.object({
    found: z.boolean(),
    application: z
      .object({
        id: z.string(),
        companyName: z.string(),
        title: z.string(),
        stage: z.string(),
        location: z.string().nullable(),
        notes: z.string().nullable()
      })
      .nullable()
  }),
  execute: async ({ applicationId, id }, context) => {
    // Force tenant from requestContext — ignore any model-supplied identity.
    const resolvedId = (applicationId ?? id ?? "").trim();
    const userId = context.requestContext?.get?.("userId") as string | undefined;
    if (!userId || !resolvedId) {
      return { found: false, application: null };
    }
    const db = createDb();
    const row = await runWithDb(db, () =>
      applicationRepository.findByIdForUser(resolvedId, userId)
    );
    if (!row) return { found: false, application: null };
    return {
      found: true,
      application: {
        id: row.id,
        companyName: row.companyName,
        title: row.title,
        stage: row.stage,
        location: row.location ?? null,
        notes: row.notes ? row.notes.slice(0, 400) : null
      }
    };
  }
});
