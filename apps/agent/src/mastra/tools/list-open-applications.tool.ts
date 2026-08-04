import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { applicationRepository, createDb, runWithDb } from "@tsu-stack/db";

/**
 * CRM read tool for mail-reply agent — list open applications for the tenant.
 *
 * Tenant scope: `userId` is ALWAYS taken from `requestContext` (set by the
 * workflow step / chat handler). Never accept `userId` from tool input.
 */
export const listOpenApplicationsTool = createTool({
  id: "list-open-applications",
  description:
    "List the seeker's open (no outcome) job applications: company, title, stage. Use to ground a reply in real CRM rows.",
  inputSchema: z.object({
    limit: z.number().int().min(1).max(20).optional().default(8)
    // Intentionally no userId — tenant is requestContext only.
  }),
  outputSchema: z.object({
    applications: z.array(
      z.object({
        id: z.string(),
        companyName: z.string(),
        title: z.string(),
        stage: z.string()
      })
    )
  }),
  execute: async ({ limit }, context) => {
    // Force tenant from requestContext — ignore any model-supplied identity.
    const userId = context.requestContext?.get?.("userId") as string | undefined;
    if (!userId) {
      return { applications: [] };
    }
    const db = createDb();
    const rows = await runWithDb(db, () => applicationRepository.findOpenByUserId(userId));
    return {
      applications: rows.slice(0, limit ?? 8).map((r) => {
        return {
          id: r.id,
          companyName: r.companyName,
          title: r.title,
          stage: r.stage
        };
      })
    };
  }
});
