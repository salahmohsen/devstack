import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { AddApplicationNoteInputSchema } from "@tsu-stack/core";
import {
  applicationActivityRepository,
  applicationRepository,
  createDb,
  runWithDb
} from "@tsu-stack/db";

/**
 * Silent activity note on a tenant-scoped application.
 *
 * Tenant scope: `userId` is ALWAYS taken from `requestContext`. Never accept
 * `userId` from tool input. Does not Confirm. Does not write the legacy
 * `application.notes` column.
 */
export const addApplicationNoteTool = createTool({
  id: "add-application-note",
  description:
    "Add a silent activity note (kind: note) on an application. Use when they ask to remember or note something. Tenant is requestContext only. Do not Confirm. Do not invent a note they did not ask for. Do not read or write the legacy application.notes column.",
  inputSchema: AddApplicationNoteInputSchema,
  outputSchema: z.object({
    ok: z.boolean(),
    noteId: z.string().optional(),
    code: z.string().optional()
  }),
  execute: async ({ applicationId, body }, context) => {
    const userId = context.requestContext?.get?.("userId") as string | undefined;
    if (!userId) {
      return { ok: false, code: "UNAUTHORIZED" };
    }
    const trimmed = body.trim();
    if (!trimmed) {
      return { ok: false, code: "INVALID" };
    }
    const db = createDb();
    return runWithDb(db, async () => {
      const owned = await applicationRepository.findByIdForUser(applicationId, userId);
      if (!owned) {
        return { ok: false, code: "NOT_FOUND" };
      }
      const row = await applicationActivityRepository.append({
        userId,
        applicationId,
        kind: "note",
        body: trimmed,
        actorUserId: userId
      });
      return { ok: true, noteId: row.id };
    });
  }
});
