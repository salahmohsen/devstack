import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { applicationRepository, createDb, runWithDb } from "@tsu-stack/db";

/**
 * CRM read tool — single application by id for the current tenant.
 */
export const getApplicationTool = createTool({
  id: "get-application",
  description:
    "Fetch one application by id (company, title, stage, location, notes snippet) for the current user only.",
  inputSchema: z.object({
    applicationId: z.string().min(1)
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
