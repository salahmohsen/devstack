import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { createDb, mailMessageRepository, runWithDb } from "@tsu-stack/db";

/**
 * Career Inbox list (excludes system notifications by default).
 */
export const listMailTool = createTool({
  id: "list-mail",
  description:
    "List the user's emails (Career Inbox): id, subject, from, category/labels, receivedAt. Use when they say emails, inbox, mail, messages, or recruiter emails. Excludes system notifications. Optional category filter. Use before getMail or generateMailReply.",
  inputSchema: z.object({
    category: z
      .string()
      .optional()
      .nullable()
      .describe("Optional Career Inbox label/category to filter, e.g. job_notifier"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .default(20)
      .describe("Max messages to return (1–50, default 20)")
  }),
  outputSchema: z.object({
    messages: z.array(
      z.object({
        id: z.string(),
        subject: z.string(),
        fromName: z.string(),
        fromEmail: z.string(),
        labels: z.array(z.string()),
        receivedAt: z.string().nullable(),
        applicationId: z.string().nullable(),
        preview: z.string()
      })
    ),
    code: z.string().optional()
  }),
  execute: async ({ category, limit }, context) => {
    const userId = context.requestContext?.get?.("userId") as string | undefined;
    if (!userId) {
      return { messages: [], code: "UNAUTHORIZED" };
    }
    const db = createDb();
    const rows = await runWithDb(db, () =>
      mailMessageRepository.findByUserId({
        userId,
        category: category ?? undefined,
        includeSystem: false,
        limit: limit ?? 20
      })
    );
    return {
      messages: rows.map((r) => {
        return {
          id: r.id,
          subject: r.subject ?? "",
          fromName: r.fromName ?? "",
          fromEmail: r.fromEmail ?? "",
          labels: r.labels ?? [],
          receivedAt: r.receivedAt ? r.receivedAt.toISOString() : null,
          applicationId: r.applicationId ?? null,
          preview: r.preview ?? ""
        };
      })
    };
  }
});
