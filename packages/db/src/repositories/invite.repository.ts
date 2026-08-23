import { randomUUID } from "node:crypto";

import {
  and,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  or,
  sql,
  type InferInsertModel,
  type InferSelectModel
} from "drizzle-orm";

import { getDb } from "../index.ts";
import { user } from "../schema/auth.schema.ts";
import { inviteRedemption } from "../schema/invite-redemption.schema.ts";
import { invite } from "../schema/invite.schema.ts";

export type InviteEntity = InferSelectModel<typeof invite>;
export type InviteRedemptionEntity = InferSelectModel<typeof inviteRedemption>;

export type CreateInviteInput = {
  id: string;
  code: string;
  createdByUserId: string | null;
  name?: string | null;
  email?: string | null;
  maxUses?: number | null;
  expiresAt?: Date | null;
};

function isInviteOpen(row: InviteEntity, now: Date): boolean {
  if (row.revokedAt) return false;
  if (row.expiresAt && row.expiresAt.getTime() <= now.getTime()) return false;
  if (row.maxUses != null && row.useCount >= row.maxUses) return false;
  return true;
}

export const inviteRepository = {
  /**
   * Open invite whose code matches (not revoked, not expired, capacity remaining).
   */
  async findValidByCode(code: string): Promise<InviteEntity | null> {
    const normalized = code.trim();
    if (!normalized) return null;

    const now = new Date();
    const [row] = await getDb().select().from(invite).where(eq(invite.code, normalized)).limit(1);

    if (!row || !isInviteOpen(row, now)) return null;
    return row;
  },

  async findById(id: string): Promise<InviteEntity | null> {
    const [row] = await getDb().select().from(invite).where(eq(invite.id, id)).limit(1);
    return row ?? null;
  },

  async create(input: CreateInviteInput): Promise<InviteEntity> {
    const [row] = await getDb()
      .insert(invite)
      .values({
        id: input.id,
        code: input.code.trim(),
        name: input.name?.trim() ?? null,
        createdByUserId: input.createdByUserId,
        email: input.email ?? null,
        maxUses: input.maxUses === undefined ? 1 : input.maxUses,
        expiresAt: input.expiresAt ?? null
      } satisfies InferInsertModel<typeof invite>)
      .returning();

    if (!row) {
      throw new Error("Failed to create invite");
    }
    return row;
  },

  /**
   * Atomically consume one use of an open invite and record attribution.
   * @returns true if a row was updated (still had capacity)
   */
  async consume(id: string, userId: string): Promise<boolean> {
    const db = getDb();
    const redemptionId = randomUUID();
    const now = new Date();

    return db.transaction(async (tx) => {
      const [updated] = await tx
        .update(invite)
        .set({
          useCount: sql`${invite.useCount} + 1`,
          usedAt: now,
          usedByUserId: userId
        })
        .where(
          and(
            eq(invite.id, id),
            isNull(invite.revokedAt),
            or(isNull(invite.expiresAt), gt(invite.expiresAt, now)),
            or(isNull(invite.maxUses), sql`${invite.useCount} < ${invite.maxUses}`)
          )
        )
        .returning({ id: invite.id });

      if (!updated) return false;

      await tx.insert(inviteRedemption).values({
        id: redemptionId,
        inviteId: id,
        userId,
        usedAt: now
      });

      return true;
    });
  },

  /**
   * @deprecated Use {@link consume}.
   */
  async markUsed(id: string, userId: string): Promise<boolean> {
    return inviteRepository.consume(id, userId);
  },

  async listByCreator(userId: string): Promise<InviteEntity[]> {
    return getDb()
      .select()
      .from(invite)
      .where(eq(invite.createdByUserId, userId))
      .orderBy(desc(invite.createdAt));
  },

  async listAll(): Promise<InviteEntity[]> {
    return getDb().select().from(invite).orderBy(desc(invite.createdAt));
  },

  async countOpen(now = new Date()): Promise<number> {
    const [row] = await getDb()
      .select({ value: sql<number>`count(*)::int` })
      .from(invite)
      .where(
        and(
          isNull(invite.revokedAt),
          or(isNull(invite.expiresAt), gt(invite.expiresAt, now)),
          or(isNull(invite.maxUses), sql`${invite.useCount} < ${invite.maxUses}`)
        )
      );
    return Number(row?.value ?? 0);
  },

  /**
   * Soft-revoke remaining capacity. History (redemptions) stays.
   */
  async revoke(id: string, _userId?: string): Promise<boolean> {
    const [updated] = await getDb()
      .update(invite)
      .set({ revokedAt: new Date() })
      .where(and(eq(invite.id, id), isNull(invite.revokedAt)))
      .returning({ id: invite.id });

    return Boolean(updated);
  },

  async listSignups(inviteId: string): Promise<
    Array<{
      id: string;
      name: string;
      email: string;
      username: string;
      image: string | null;
      usedAt: Date;
    }>
  > {
    return getDb()
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        image: user.image,
        usedAt: inviteRedemption.usedAt
      })
      .from(inviteRedemption)
      .innerJoin(user, eq(inviteRedemption.userId, user.id))
      .where(eq(inviteRedemption.inviteId, inviteId))
      .orderBy(desc(inviteRedemption.usedAt));
  },

  async findAttributionByUserIds(
    userIds: string[]
  ): Promise<Map<string, { id: string; name: string | null; code: string; email: string | null }>> {
    const map = new Map<
      string,
      { id: string; name: string | null; code: string; email: string | null }
    >();
    if (userIds.length === 0) return map;

    const rows = await getDb()
      .select({
        userId: inviteRedemption.userId,
        id: invite.id,
        name: invite.name,
        code: invite.code,
        email: invite.email
      })
      .from(inviteRedemption)
      .innerJoin(invite, eq(inviteRedemption.inviteId, invite.id))
      .where(inArray(inviteRedemption.userId, userIds));

    for (const row of rows) {
      if (!row.userId) continue;
      map.set(row.userId, {
        id: row.id,
        name: row.name,
        code: row.code,
        email: row.email
      });
    }
    return map;
  }
};
