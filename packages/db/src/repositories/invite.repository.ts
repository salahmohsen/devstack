import {
  and,
  desc,
  eq,
  gt,
  isNull,
  or,
  type InferInsertModel,
  type InferSelectModel
} from "drizzle-orm";

import { getDb } from "../index.ts";
import { invite } from "../schema/invite.schema.ts";

export type InviteEntity = InferSelectModel<typeof invite>;

export type CreateInviteInput = {
  id: string;
  code: string;
  createdByUserId: string | null;
  expiresAt?: Date | null;
};

export const inviteRepository = {
  /**
   * Unused invite whose code matches and is not past expiresAt (null = never expires).
   */
  async findValidByCode(code: string): Promise<InviteEntity | null> {
    const normalized = code.trim();
    if (!normalized) return null;

    const now = new Date();
    const [row] = await getDb()
      .select()
      .from(invite)
      .where(
        and(
          eq(invite.code, normalized),
          isNull(invite.usedAt),
          or(isNull(invite.expiresAt), gt(invite.expiresAt, now))
        )
      )
      .limit(1);

    return row ?? null;
  },

  async create(input: CreateInviteInput): Promise<InviteEntity> {
    const [row] = await getDb()
      .insert(invite)
      .values({
        id: input.id,
        code: input.code.trim(),
        createdByUserId: input.createdByUserId,
        expiresAt: input.expiresAt ?? null
      } satisfies InferInsertModel<typeof invite>)
      .returning();

    if (!row) {
      throw new Error("Failed to create invite");
    }
    return row;
  },

  /**
   * Atomically marks an unused invite as used.
   * @returns true if a row was updated (was still unused)
   */
  async markUsed(id: string, userId: string): Promise<boolean> {
    const [updated] = await getDb()
      .update(invite)
      .set({
        usedAt: new Date(),
        usedByUserId: userId
      })
      .where(and(eq(invite.id, id), isNull(invite.usedAt)))
      .returning({ id: invite.id });

    return Boolean(updated);
  },

  async listByCreator(userId: string): Promise<InviteEntity[]> {
    return getDb()
      .select()
      .from(invite)
      .where(eq(invite.createdByUserId, userId))
      .orderBy(desc(invite.createdAt));
  },

  /**
   * Revoke an unused invite owned by userId. Used invites are left alone.
   * @returns true if a row was deleted
   */
  async revoke(id: string, userId: string): Promise<boolean> {
    const deleted = await getDb()
      .delete(invite)
      .where(and(eq(invite.id, id), eq(invite.createdByUserId, userId), isNull(invite.usedAt)))
      .returning({ id: invite.id });

    return deleted.length > 0;
  }
};
