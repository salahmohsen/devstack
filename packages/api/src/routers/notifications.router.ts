import {
  AppNotificationIdInputSchema,
  AppNotificationItemSchema,
  AppNotificationListInputSchema,
  AppNotificationListOutputSchema,
  MarkAllReadOutputSchema,
  NotificationKindSchema
} from "@tsu-stack/core";
import { appNotificationRepository } from "@tsu-stack/db/repositories";

import { protectedProcedure } from "#@/lib/procedures/factory";

function toItem(
  row: NonNullable<Awaited<ReturnType<typeof appNotificationRepository.findByIdForUser>>>
) {
  const kind = NotificationKindSchema.safeParse(row.kind);
  return AppNotificationItemSchema.parse({
    id: row.id,
    kind: kind.success ? kind.data : "workflow.finished",
    title: row.title,
    body: row.body,
    href: row.href,
    readAt: row.readAt,
    createdAt: row.createdAt,
    messageId: row.messageId,
    applicationId: row.applicationId
  });
}

export const notificationsRouter = {
  list: protectedProcedure
    .route({
      description: "List in-app notifications for the current user",
      method: "GET"
    })
    .input(AppNotificationListInputSchema)
    .output(AppNotificationListOutputSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const [items, unreadCount] = await Promise.all([
        appNotificationRepository.listForUser({
          userId,
          unreadOnly: input.unreadOnly,
          limit: input.limit
        }),
        appNotificationRepository.countUnread(userId)
      ]);
      return {
        items: items.map(toItem),
        unreadCount
      };
    }),

  markRead: protectedProcedure
    .route({
      description: "Mark one notification as read",
      method: "POST"
    })
    .input(AppNotificationIdInputSchema)
    .output(AppNotificationItemSchema)
    .errors({
      NOT_FOUND: { message: "Notification not found", status: 404 }
    })
    .handler(async ({ input, context, errors }) => {
      const userId = context.session.user.id;
      const marked = await appNotificationRepository.markRead(input.id, userId);
      const row = marked ?? (await appNotificationRepository.findByIdForUser(input.id, userId));
      if (!row) throw errors.NOT_FOUND();
      return toItem(row);
    }),

  markAllRead: protectedProcedure
    .route({
      description: "Mark all notifications as read for the current user",
      method: "POST"
    })
    .output(MarkAllReadOutputSchema)
    .handler(async ({ context }) => {
      const updated = await appNotificationRepository.markAllRead(context.session.user.id);
      return { updated };
    })
};
