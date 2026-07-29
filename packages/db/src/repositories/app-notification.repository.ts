import { and, desc, eq, isNull, sql, type InferSelectModel } from "drizzle-orm";

import { getDb } from "../index.ts";
import { appNotification } from "../schema/app-notification.schema.ts";

export type AppNotificationEntity = InferSelectModel<typeof appNotification>;

export type CreateAppNotificationData = {
  id?: string;
  userId: string;
  kind: string;
  title: string;
  body?: string | null;
  href?: string | null;
  messageId?: string | null;
  applicationId?: string | null;
  reviewItemId?: string | null;
};

export const appNotificationRepository = {
  async listForUser(input: {
    userId: string;
    unreadOnly?: boolean;
    limit?: number;
  }): Promise<AppNotificationEntity[]> {
    const limit = input.limit ?? 30;
    const conditions = [eq(appNotification.userId, input.userId)];
    if (input.unreadOnly) conditions.push(isNull(appNotification.readAt));

    return getDb()
      .select()
      .from(appNotification)
      .where(and(...conditions))
      .orderBy(desc(appNotification.createdAt))
      .limit(limit);
  },

  async countUnread(userId: string): Promise<number> {
    const [row] = await getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(appNotification)
      .where(and(eq(appNotification.userId, userId), isNull(appNotification.readAt)));
    return row?.count ?? 0;
  },

  async findByIdForUser(id: string, userId: string): Promise<AppNotificationEntity | null> {
    const [row] = await getDb()
      .select()
      .from(appNotification)
      .where(and(eq(appNotification.id, id), eq(appNotification.userId, userId)))
      .limit(1);
    return row ?? null;
  },

  async create(input: CreateAppNotificationData): Promise<AppNotificationEntity> {
    const id = input.id ?? crypto.randomUUID();
    const [created] = await getDb()
      .insert(appNotification)
      .values({
        id,
        userId: input.userId,
        kind: input.kind,
        title: input.title,
        body: input.body ?? null,
        href: input.href ?? null,
        messageId: input.messageId ?? null,
        applicationId: input.applicationId ?? null,
        reviewItemId: input.reviewItemId ?? null
      })
      .returning();
    return created;
  },

  async markRead(id: string, userId: string): Promise<AppNotificationEntity | null> {
    const [updated] = await getDb()
      .update(appNotification)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(appNotification.id, id),
          eq(appNotification.userId, userId),
          isNull(appNotification.readAt)
        )
      )
      .returning();
    return updated ?? null;
  },

  async markAllRead(userId: string): Promise<number> {
    const rows = await getDb()
      .update(appNotification)
      .set({ readAt: new Date() })
      .where(and(eq(appNotification.userId, userId), isNull(appNotification.readAt)))
      .returning({ id: appNotification.id });
    return rows.length;
  }
};
