import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { appNotificationRepository, createDb, runWithDb } from "@tsu-stack/db";

/**
 * List in-app notifications for the tenant.
 */
export const listNotificationsTool = createTool({
  id: "list-notifications",
  description:
    "List in-app notifications: id, kind, title, href, applicationId, messageId, readAt, createdAt. Optional unreadOnly. Use before markNotificationRead for related focus-job notifs only.",
  inputSchema: z.object({
    unreadOnly: z.boolean().optional().default(false).describe("true = unread only; false = all"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .default(20)
      .describe("Max notifications to return (1–50, default 20)")
  }),
  outputSchema: z.object({
    notifications: z.array(
      z.object({
        id: z.string(),
        kind: z.string(),
        title: z.string(),
        href: z.string().nullable(),
        applicationId: z.string().nullable(),
        messageId: z.string().nullable(),
        readAt: z.string().nullable(),
        createdAt: z.string().nullable()
      })
    ),
    code: z.string().optional()
  }),
  execute: async ({ unreadOnly, limit }, context) => {
    const userId = context.requestContext?.get?.("userId") as string | undefined;
    if (!userId) {
      return { notifications: [], code: "UNAUTHORIZED" };
    }
    const db = createDb();
    const rows = await runWithDb(db, () =>
      appNotificationRepository.listForUser({
        userId,
        unreadOnly: unreadOnly ?? false,
        limit: limit ?? 20
      })
    );
    return {
      notifications: rows.map((r) => {
        return {
          id: r.id,
          kind: r.kind,
          title: r.title,
          href: r.href ?? null,
          applicationId: r.applicationId ?? null,
          messageId: r.messageId ?? null,
          readAt: r.readAt ? r.readAt.toISOString() : null,
          createdAt: r.createdAt ? r.createdAt.toISOString() : null
        };
      })
    };
  }
});
