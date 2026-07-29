import { and, eq, isNull, type InferSelectModel } from "drizzle-orm";

import { getDb } from "../index.ts";
import { mailCrmApply } from "../schema/mail-crm-apply.schema.ts";

export type MailCrmApplyEntity = InferSelectModel<typeof mailCrmApply>;

export type CreateMailCrmApplyData = {
  id?: string;
  userId: string;
  messageId: string;
  applicationId?: string | null;
  effectKind: string;
  reason?: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
};

export const mailCrmApplyRepository = {
  async findByIdForUser(id: string, userId: string): Promise<MailCrmApplyEntity | null> {
    const [row] = await getDb()
      .select()
      .from(mailCrmApply)
      .where(and(eq(mailCrmApply.id, id), eq(mailCrmApply.userId, userId)))
      .limit(1);
    return row ?? null;
  },

  async findByMessageId(messageId: string, userId: string): Promise<MailCrmApplyEntity | null> {
    const [row] = await getDb()
      .select()
      .from(mailCrmApply)
      .where(and(eq(mailCrmApply.messageId, messageId), eq(mailCrmApply.userId, userId)))
      .limit(1);
    return row ?? null;
  },

  /** Active (not undone) apply for a message — used for idempotent worker apply. */
  async findActiveByMessageId(
    messageId: string,
    userId: string
  ): Promise<MailCrmApplyEntity | null> {
    const [row] = await getDb()
      .select()
      .from(mailCrmApply)
      .where(
        and(
          eq(mailCrmApply.messageId, messageId),
          eq(mailCrmApply.userId, userId),
          isNull(mailCrmApply.undoneAt)
        )
      )
      .limit(1);
    return row ?? null;
  },

  async create(input: CreateMailCrmApplyData): Promise<MailCrmApplyEntity> {
    const id = input.id ?? crypto.randomUUID();
    const [created] = await getDb()
      .insert(mailCrmApply)
      .values({
        id,
        userId: input.userId,
        messageId: input.messageId,
        applicationId: input.applicationId ?? null,
        effectKind: input.effectKind,
        reason: input.reason ?? "",
        before: input.before,
        after: input.after
      })
      .returning();
    return created;
  },

  async markUndone(id: string, userId: string): Promise<MailCrmApplyEntity | null> {
    const [updated] = await getDb()
      .update(mailCrmApply)
      .set({ undoneAt: new Date() })
      .where(
        and(eq(mailCrmApply.id, id), eq(mailCrmApply.userId, userId), isNull(mailCrmApply.undoneAt))
      )
      .returning();
    return updated ?? null;
  }
};
