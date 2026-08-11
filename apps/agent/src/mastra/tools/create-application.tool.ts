import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { applicationRepository, createDb, runWithDb } from "@tsu-stack/db";

/**
 * Create (or find by listing URL) a CRM application for the current tenant.
 *
 * Tenant scope: `userId` is ALWAYS taken from `requestContext` (set by the
 * chat handler). Never accept `userId` from tool input.
 *
 * - With `url`: race-safe `createIfAbsentByUrl` (v1 conflict returns existing
 *   without overwriting description).
 * - Without `url`: plain `create`.
 * Always stores full `description` on create.
 */
export const createApplicationTool = createTool({
  id: "create-application",
  description:
    "Create a job application in CRM (stage saved). Prefer after propose-application-from-jd save|package. Pass full description. With url uses create-if-absent; without url always inserts.",
  inputSchema: z.object({
    title: z.string().min(1).max(300),
    companyName: z.string().min(1).max(200),
    description: z.string().min(1).max(50_000),
    url: z.string().url().optional().nullable(),
    applyUrl: z.string().url().optional().nullable(),
    location: z.string().max(200).optional().nullable(),
    matchScore: z.number().min(0).max(100).optional().nullable(),
    notes: z.string().max(2000).optional().nullable()
    // Intentionally no userId — tenant is requestContext only.
  }),
  outputSchema: z.object({
    applicationId: z.string(),
    created: z.boolean()
  }),
  execute: async (input, context) => {
    // Force tenant from requestContext — ignore any model-supplied identity.
    const userId = context.requestContext?.get?.("userId") as string | undefined;
    if (!userId) {
      return { applicationId: "", created: false };
    }

    const trimmedUrl = input.url?.trim() ?? "";
    const listingUrl = trimmedUrl.length > 0 ? trimmedUrl : null;
    const common = {
      userId,
      companyName: input.companyName,
      title: input.title,
      applyUrl: input.applyUrl ?? null,
      location: input.location ?? null,
      matchScore: input.matchScore ?? null,
      description: input.description,
      notes: input.notes ?? null,
      stage: "saved" as const,
      hiringUrgency: "unknown" as const,
      resumeId: null
    };

    const db = createDb();
    if (listingUrl) {
      const { row, created } = await runWithDb(db, () =>
        applicationRepository.createIfAbsentByUrl({
          ...common,
          url: listingUrl
        })
      );
      return { applicationId: row.id, created };
    }

    const row = await runWithDb(db, () =>
      applicationRepository.create({
        ...common,
        url: null
      })
    );
    return { applicationId: row.id, created: true };
  }
});
