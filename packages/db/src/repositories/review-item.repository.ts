import { and, desc, eq, type InferSelectModel } from "drizzle-orm";

import { getDb } from "../index.ts";
import { application } from "../schema/application.schema.ts";
import { mailMessage } from "../schema/mail-message.schema.ts";
import {
  reviewItem,
  type ReviewItemKindDb,
  type ReviewItemStatusDb
} from "../schema/review-item.schema.ts";

export type ReviewItemEntity = InferSelectModel<typeof reviewItem>;

export type ReviewItemWithContext = ReviewItemEntity & {
  mailSubject: string | null;
  mailFromName: string | null;
  applicationCompanyName: string | null;
  applicationTitle: string | null;
};

export type CreateReviewItemData = {
  id?: string;
  userId: string;
  kind?: ReviewItemKindDb;
  status?: ReviewItemStatusDb;
  title: string;
  preview?: string;
  bodyText: string;
  bodyHtml?: string | null;
  toEmail?: string | null;
  subject?: string | null;
  messageId?: string | null;
  applicationId?: string | null;
};

export const reviewItemRepository = {
  async findByUserId(input: {
    userId: string;
    status?: ReviewItemStatusDb;
    limit?: number;
  }): Promise<ReviewItemEntity[]> {
    const limit = input.limit ?? 50;
    const conditions = [eq(reviewItem.userId, input.userId)];
    if (input.status) conditions.push(eq(reviewItem.status, input.status));

    return getDb()
      .select()
      .from(reviewItem)
      .where(and(...conditions))
      .orderBy(desc(reviewItem.createdAt))
      .limit(limit);
  },

  async findByIdForUser(id: string, userId: string): Promise<ReviewItemWithContext | null> {
    const [row] = await getDb()
      .select({
        item: reviewItem,
        mailSubject: mailMessage.subject,
        mailFromName: mailMessage.fromName,
        applicationCompanyName: application.companyName,
        applicationTitle: application.title
      })
      .from(reviewItem)
      .leftJoin(mailMessage, eq(reviewItem.messageId, mailMessage.id))
      .leftJoin(application, eq(reviewItem.applicationId, application.id))
      .where(and(eq(reviewItem.id, id), eq(reviewItem.userId, userId)))
      .limit(1);

    if (!row) return null;
    return {
      ...row.item,
      mailSubject: row.mailSubject ?? null,
      mailFromName: row.mailFromName ?? null,
      applicationCompanyName: row.applicationCompanyName ?? null,
      applicationTitle: row.applicationTitle ?? null
    };
  },

  async findPendingReplyForMessage(
    messageId: string,
    userId: string
  ): Promise<ReviewItemEntity | null> {
    const [row] = await getDb()
      .select()
      .from(reviewItem)
      .where(
        and(
          eq(reviewItem.userId, userId),
          eq(reviewItem.messageId, messageId),
          eq(reviewItem.kind, "reply_draft"),
          eq(reviewItem.status, "pending")
        )
      )
      .limit(1);
    return row ?? null;
  },

  async create(input: CreateReviewItemData): Promise<ReviewItemEntity> {
    const id = input.id ?? crypto.randomUUID();
    const preview = input.preview ?? input.bodyText.replace(/\s+/g, " ").trim().slice(0, 200);

    const [created] = await getDb()
      .insert(reviewItem)
      .values({
        id,
        userId: input.userId,
        kind: input.kind ?? "reply_draft",
        status: input.status ?? "pending",
        title: input.title,
        preview,
        bodyText: input.bodyText,
        bodyHtml: input.bodyHtml ?? null,
        toEmail: input.toEmail ?? null,
        subject: input.subject ?? null,
        messageId: input.messageId ?? null,
        applicationId: input.applicationId ?? null
      })
      .returning();
    return created;
  },

  async updateBody(
    id: string,
    userId: string,
    patch: {
      bodyText?: string;
      bodyHtml?: string | null;
      subject?: string | null;
      title?: string;
      preview?: string;
    }
  ): Promise<ReviewItemEntity | null> {
    const [updated] = await getDb()
      .update(reviewItem)
      .set({
        ...(patch.bodyText !== undefined ? { bodyText: patch.bodyText } : {}),
        ...(patch.bodyHtml !== undefined ? { bodyHtml: patch.bodyHtml } : {}),
        ...(patch.subject !== undefined ? { subject: patch.subject } : {}),
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.preview !== undefined ? { preview: patch.preview } : {})
      })
      .where(and(eq(reviewItem.id, id), eq(reviewItem.userId, userId)))
      .returning();
    return updated ?? null;
  },

  async setStatus(
    id: string,
    userId: string,
    status: ReviewItemStatusDb
  ): Promise<ReviewItemEntity | null> {
    const resolved = status === "pending" ? null : new Date();
    const [updated] = await getDb()
      .update(reviewItem)
      .set({
        status,
        resolvedAt: resolved
      })
      .where(and(eq(reviewItem.id, id), eq(reviewItem.userId, userId)))
      .returning();
    return updated ?? null;
  }
};
