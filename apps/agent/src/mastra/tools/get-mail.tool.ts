import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { createDb, mailMessageRepository, runWithDb } from "@tsu-stack/db";

/**
 * Career Inbox message detail by id.
 */
export const getMailTool = createTool({
  id: "get-mail",
  description:
    "Get one Career Inbox message by id (full body). Use listMail first for real ids. Never call with empty id.",
  inputSchema: z.object({
    messageId: z.string().min(1).describe("Mail message id from listMail")
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    message: z
      .object({
        id: z.string(),
        subject: z.string(),
        fromName: z.string(),
        fromEmail: z.string(),
        labels: z.array(z.string()),
        bodyText: z.string(),
        preview: z.string(),
        applicationId: z.string().nullable(),
        receivedAt: z.string().nullable()
      })
      .optional(),
    code: z.string().optional(),
    messageText: z.string().optional()
  }),
  execute: async ({ messageId }, context) => {
    const userId = context.requestContext?.get?.("userId") as string | undefined;
    if (!userId) {
      return { ok: false, code: "UNAUTHORIZED", messageText: "No tenant" };
    }
    const db = createDb();
    const row = await runWithDb(db, () =>
      mailMessageRepository.findByIdForUser(messageId, userId, { includeSystem: false })
    );
    if (!row) {
      return { ok: false, code: "NOT_FOUND", messageText: "Mail message not found" };
    }
    return {
      ok: true,
      message: {
        id: row.id,
        subject: row.subject ?? "",
        fromName: row.fromName ?? "",
        fromEmail: row.fromEmail ?? "",
        labels: row.labels ?? [],
        bodyText: row.bodyText ?? "",
        preview: row.preview ?? "",
        applicationId: row.applicationId ?? null,
        receivedAt: row.receivedAt ? row.receivedAt.toISOString() : null
      }
    };
  }
});
