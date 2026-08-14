import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { appNotificationRepository, createDb, runWithDb } from "@tsu-stack/db";

/**
 * Mark one notification read. Tenant-scoped. Related-only (instructions).
 */
export const markNotificationReadTool = createTool({
  id: "mark-notification-read",
  description:
    "Mark one notification as read by id. Only mark notifs related to this turn's focus job or mail (never mark-all). Use listNotifications first.",
  inputSchema: z.object({
    notificationId: z.string().min(1)
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    notificationId: z.string().optional(),
    code: z.string().optional(),
    message: z.string().optional()
  }),
  execute: async ({ notificationId }, context) => {
    const userId = context.requestContext?.get?.("userId") as string | undefined;
    if (!userId) {
      return { ok: false, code: "UNAUTHORIZED", message: "No tenant" };
    }
    const db = createDb();
    const marked = await runWithDb(db, () =>
      appNotificationRepository.markRead(notificationId, userId)
    );
    if (!marked) {
      const existing = await runWithDb(db, () =>
        appNotificationRepository.findByIdForUser(notificationId, userId)
      );
      if (!existing) {
        return {
          ok: false,
          notificationId,
          code: "NOT_FOUND",
          message: "Notification not found"
        };
      }
      // Already read
      return { ok: true, notificationId };
    }
    return { ok: true, notificationId };
  }
});
