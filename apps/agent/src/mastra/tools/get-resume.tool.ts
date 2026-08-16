import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { createDb, resumeRepository, runWithDb } from "@tsu-stack/db";

/**
 * Evidence graph read — single resume metadata by id (no PDF/bytes).
 *
 * Tenant scope: `userId` is ALWAYS taken from `requestContext` (set by the
 * workflow step / chat handler). Never accept `userId` from tool input.
 */
export const getResumeTool = createTool({
  id: "get-resume",
  description:
    "Fetch one resume's metadata by id (filename, default flag, dates) for the current user only. No file bytes.",
  inputSchema: z.object({
    resumeId: z.string().min(1).describe("Resume id from listResumes. Required.")
    // Intentionally no userId — tenant is requestContext only.
  }),
  outputSchema: z.object({
    found: z.boolean(),
    resume: z
      .object({
        id: z.string(),
        title: z.string(),
        isDefault: z.boolean(),
        author: z.string(),
        createdAt: z.string(),
        updatedAt: z.string()
      })
      .nullable()
  }),
  execute: async ({ resumeId }, context) => {
    // Force tenant from requestContext — ignore any model-supplied identity.
    const userId = context.requestContext?.get?.("userId") as string | undefined;
    if (!userId) {
      return { found: false, resume: null };
    }
    const db = createDb();
    const row = await runWithDb(db, () => resumeRepository.findByIdForUser(resumeId, userId));
    if (!row) return { found: false, resume: null };
    return {
      found: true,
      resume: {
        id: row.id,
        // filename is the human-facing label; no r2Key / private bytes.
        title: row.filename,
        isDefault: row.default,
        author: row.author,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString()
      }
    };
  }
});
