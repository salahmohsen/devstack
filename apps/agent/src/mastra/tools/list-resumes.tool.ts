import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { createDb, resumeRepository, runWithDb } from "@tsu-stack/db";

/**
 * Evidence graph read — list resume metadata for the tenant (no PDF/bytes).
 *
 * Tenant scope: `userId` is ALWAYS taken from `requestContext` (set by the
 * workflow step / chat handler). Never accept `userId` from tool input.
 */
export const listResumesTool = createTool({
  id: "list-resumes",
  description:
    "List resume metadata (id, filename, default flag, dates) for linking packages or CRM. No file bytes.",
  inputSchema: z.object({
    limit: z.number().int().min(1).max(20).optional().default(20)
    // Intentionally no userId — tenant is requestContext only.
  }),
  outputSchema: z.object({
    resumes: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        isDefault: z.boolean(),
        author: z.string(),
        createdAt: z.string(),
        updatedAt: z.string()
      })
    )
  }),
  execute: async ({ limit }, context) => {
    // Force tenant from requestContext — ignore any model-supplied identity.
    const userId = context.requestContext?.get?.("userId") as string | undefined;
    if (!userId) {
      return { resumes: [] };
    }
    const db = createDb();
    const rows = await runWithDb(db, () => resumeRepository.findAllByUserId(userId));
    return {
      resumes: rows.slice(0, limit ?? 20).map((r) => {
        return {
          id: r.id,
          // filename is the human-facing label; no r2Key / private bytes.
          title: r.filename,
          isDefault: r.default,
          author: r.author,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString()
        };
      })
    };
  }
});
