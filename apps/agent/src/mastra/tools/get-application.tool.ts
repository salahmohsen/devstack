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
      .describe("Application id from listNewJobs or listOpenApplications")
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
  execute: async ({ applicationId }, context) => {
    // Force tenant from requestContext — ignore any model-supplied identity.
    const userId = context.requestContext?.get?.("userId") as string | undefined;
    if (!userId) {
      return { found: false, application: null };
    }
    const db = createDb();
    const row = await runWithDb(db, () =>
      applicationRepository.findByIdForUser(applicationId, userId)
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
