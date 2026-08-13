import { z } from "zod";

import { NotificationKindSchema } from "#@/notification-settings/types";

export const AppNotificationListInputSchema = z.object({
  unreadOnly: z.boolean().optional().default(false),
  limit: z.number().int().min(1).max(100).optional().default(30)
});
export type AppNotificationListInput = z.infer<typeof AppNotificationListInputSchema>;

export const AppNotificationItemSchema = z.object({
  id: z.string(),
  kind: NotificationKindSchema,
  title: z.string(),
  body: z.string().nullable(),
  href: z.string().nullable(),
  readAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  /** Optional entity links for deep navigation. */
  messageId: z.string().nullable(),
  applicationId: z.string().nullable()
});
export type AppNotificationItem = z.infer<typeof AppNotificationItemSchema>;

export const AppNotificationListOutputSchema = z.object({
  items: z.array(AppNotificationItemSchema),
  unreadCount: z.number().int().min(0)
});
export type AppNotificationListOutput = z.infer<typeof AppNotificationListOutputSchema>;

export const AppNotificationIdInputSchema = z.object({
  id: z.string().min(1)
});
export type AppNotificationIdInput = z.infer<typeof AppNotificationIdInputSchema>;

export const MarkAllReadOutputSchema = z.object({
  updated: z.number().int().min(0)
});
export type MarkAllReadOutput = z.infer<typeof MarkAllReadOutputSchema>;
