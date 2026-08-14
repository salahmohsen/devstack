import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { generateMailReply } from "#@/mastra/lib/generate-mail-reply";

/**
 * Draft bare Inbox reply (subject + body). No send, no PDF.
 */
export const generateMailReplyTool = createTool({
  id: "generate-mail-reply",
  description:
    "Draft a Career Inbox reply (subject + body only). No send, no PDF attachments. Use real messageId from listMail/getMail. Follow-up path after first-apply.",
  inputSchema: z.object({
    messageId: z.string().min(1)
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    subject: z.string().optional(),
    bodyText: z.string().optional(),
    code: z.string().optional(),
    message: z.string().optional()
  }),
  execute: async ({ messageId }, context) => {
    const userId = context.requestContext?.get?.("userId") as string | undefined;
    if (!userId) {
      return { ok: false, code: "UNAUTHORIZED", message: "No tenant" };
    }
    const result = await generateMailReply({ messageId, userId });
    if (!result.ok) {
      return { ok: false, code: result.code, message: result.message };
    }
    return {
      ok: true,
      subject: result.draft.subject,
      bodyText: result.draft.bodyText
    };
  }
});
