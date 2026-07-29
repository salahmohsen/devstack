import { eq, type InferSelectModel } from "drizzle-orm";

import { getDb } from "../index.ts";
import { userGmailSync } from "../schema/user-gmail-sync.schema.ts";

export type UserGmailSyncEntity = InferSelectModel<typeof userGmailSync>;

export type UpsertUserGmailSyncInput = {
  id: string;
  userId: string;
  historyId?: string | null;
  emailAddress?: string | null;
  lastSyncedAt?: Date | null;
  lastError?: string | null;
};

export const userGmailSyncRepository = {
  async findByUserId(userId: string): Promise<UserGmailSyncEntity | null> {
    const [row] = await getDb()
      .select()
      .from(userGmailSync)
      .where(eq(userGmailSync.userId, userId))
      .limit(1);
    return row ?? null;
  },

  async upsert(input: UpsertUserGmailSyncInput): Promise<UserGmailSyncEntity> {
    const existing = await this.findByUserId(input.userId);
    if (existing) {
      const [row] = await getDb()
        .update(userGmailSync)
        .set({
          historyId: input.historyId !== undefined ? input.historyId : existing.historyId,
          emailAddress:
            input.emailAddress !== undefined ? input.emailAddress : existing.emailAddress,
          lastSyncedAt:
            input.lastSyncedAt !== undefined ? input.lastSyncedAt : existing.lastSyncedAt,
          lastError: input.lastError !== undefined ? input.lastError : existing.lastError
        })
        .where(eq(userGmailSync.userId, input.userId))
        .returning();
      return row!;
    }

    const [row] = await getDb()
      .insert(userGmailSync)
      .values({
        id: input.id,
        userId: input.userId,
        historyId: input.historyId ?? null,
        emailAddress: input.emailAddress ?? null,
        lastSyncedAt: input.lastSyncedAt ?? null,
        lastError: input.lastError ?? null
      })
      .returning();
    return row!;
  }
};
