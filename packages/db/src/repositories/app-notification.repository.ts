import { and, asc, desc, eq, inArray, isNull, sql, type InferSelectModel } from "drizzle-orm";

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
  emailDigestPending?: boolean;
  emailedAt?: Date | null;
  readAt?: Date | null;
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
        emailDigestPending: input.emailDigestPending ?? false,
        emailedAt: input.emailedAt ?? null,
        readAt: input.readAt ?? null
      })
      .returning();
    return created;
  },

  async markEmailed(id: string, userId: string): Promise<void> {
    await getDb()
      .update(appNotification)
      .set({ emailedAt: new Date(), emailDigestPending: false })
      .where(and(eq(appNotification.id, id), eq(appNotification.userId, userId)));
  },

  async listPendingDigestForUser(userId: string, limit = 50): Promise<AppNotificationEntity[]> {
    return getDb()
      .select()
      .from(appNotification)
      .where(and(eq(appNotification.userId, userId), eq(appNotification.emailDigestPending, true)))
      .orderBy(asc(appNotification.createdAt))
      .limit(limit);
  },

  async listUserIdsWithPendingDigest(): Promise<string[]> {
    const rows = await getDb()
      .selectDistinct({ userId: appNotification.userId })
      .from(appNotification)
      .where(eq(appNotification.emailDigestPending, true));
    return rows.map((r) => r.userId);
  },

  async markDigestEmailed(ids: string[], userId: string): Promise<number> {
    if (ids.length === 0) return 0;
    const now = new Date();
    const rows = await getDb()
      .update(appNotification)
      .set({
        emailDigestPending: false,
        emailedAt: now
      })
      .where(
        and(
          eq(appNotification.userId, userId),
          eq(appNotification.emailDigestPending, true),
          inArray(appNotification.id, ids)
        )
      )
      .returning({ id: appNotification.id });
    return rows.length;
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
