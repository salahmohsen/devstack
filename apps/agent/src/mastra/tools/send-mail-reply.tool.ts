import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { createDb, mailMessageRepository, runWithDb } from "@tsu-stack/db";

import { sendCareerReply } from "#@/mastra/lib/send-career-reply";

/**
 * Send bare Career Inbox reply (no PDF). Requires HITL approval.
 */
export const sendMailReplyTool = createTool({
  id: "send-mail-reply",
  description:
    "Send a Career Inbox reply (no PDF attachments). Recipient is the message fromEmail. Requires approval. Prefer generateMailReply first. Follow-up only — first apply uses sendApplyOutreach.",
  inputSchema: z.object({
    messageId: z.string().min(1).describe("Message being replied to (listMail / getMail id)"),
    subject: z.string().min(1).max(500).describe("Reply subject line"),
    bodyText: z.string().min(1).max(20_000).describe("Plain-text reply body, no PDF")
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    providerMessageId: z.string().nullable().optional(),
    code: z.string().optional(),
    message: z.string().optional()
  }),
  execute: async ({ messageId, subject, bodyText }, context) => {
    const userId = context.requestContext?.get?.("userId") as string | undefined;
    if (!userId) {
      return { ok: false, code: "UNAUTHORIZED", message: "No tenant" };
    }

    const db = createDb();
    const row = await runWithDb(db, () =>
      mailMessageRepository.findByIdForUser(messageId, userId, { includeSystem: true })
    );
    if (!row) {
      return { ok: false, code: "NOT_FOUND", message: "Mail message not found" };
    }
    if (row.purpose === "system_notification") {
      return { ok: false, code: "NOT_CAREER", message: "Cannot reply to system notifications" };
    }

    const sent = await sendCareerReply({
      userId,
      to: row.fromEmail,
      subject,
      bodyText
    });

    if (!sent.ok) {
      if (sent.code === "MISSING_API_KEY" || sent.code === "MISSING_FROM") {
        return { ok: false, code: "MAIL_NOT_CONFIGURED", message: sent.message };
      }
      if (sent.code === "INVALID_TO") {
        return { ok: false, code: "INVALID_TO", message: sent.message };
      }
      return { ok: false, code: "SEND_FAILED", message: sent.message };
    }

    return {
      ok: true,
      providerMessageId: sent.providerMessageId,
      message: `Sent via your Resend key from ${sent.from}.`
    };
  }
});
