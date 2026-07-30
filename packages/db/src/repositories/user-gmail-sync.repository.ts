import { randomUUID } from "node:crypto";

import { and, eq, type InferSelectModel } from "drizzle-orm";

import { getDb } from "../index.ts";
import { account } from "../schema/auth.schema.ts";
import { userGmailSync } from "../schema/user-gmail-sync.schema.ts";

export type UserGmailSyncEntity = InferSelectModel<typeof userGmailSync>;

export type UpsertUserGmailSyncInput = {
  id: string;
  userId: string;
  historyId?: string | null;
  emailAddress?: string | null;
  lastSyncedAt?: Date | null;
  lastError?: string | null;
  autoSyncEnabled?: boolean;
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

  async listByEmailAddress(emailAddress: string): Promise<UserGmailSyncEntity[]> {
    const normalized = emailAddress.trim().toLowerCase();
    return getDb().select().from(userGmailSync).where(eq(userGmailSync.emailAddress, normalized));
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
          lastError: input.lastError !== undefined ? input.lastError : existing.lastError,
          autoSyncEnabled: input.autoSyncEnabled ?? existing.autoSyncEnabled
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
        lastError: input.lastError ?? null,
        autoSyncEnabled: input.autoSyncEnabled ?? true
      })
      .returning();
    return row!;
  },

  async setAutoSyncEnabled(userId: string, autoSyncEnabled: boolean): Promise<UserGmailSyncEntity> {
    const existing = await this.findByUserId(userId);
    if (existing) {
      const [row] = await getDb()
        .update(userGmailSync)
        .set({ autoSyncEnabled })
        .where(eq(userGmailSync.userId, userId))
        .returning();
      return row!;
    }
    return this.upsert({
      id: randomUUID(),
      userId,
      autoSyncEnabled
    });
  },

  /**
   * Users with Google OAuth + Gmail scopes and auto-sync enabled (or no opt-out row).
   * Filters gmail markers in application code (scope is a free-form string).
   */
  async listUserIdsForScheduledSync(): Promise<string[]> {
    const rows = await getDb()
      .select({
        userId: account.userId,
        scope: account.scope,
        autoSyncEnabled: userGmailSync.autoSyncEnabled
      })
      .from(account)
      .leftJoin(userGmailSync, and(eq(userGmailSync.userId, account.userId)))
      .where(eq(account.providerId, "google"));

    const out: string[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
      if (seen.has(row.userId)) continue;
      if (row.autoSyncEnabled === false) continue;
      const scope = (row.scope ?? "").toLowerCase();
      if (
        !scope.includes("gmail.readonly") &&
        !scope.includes("gmail.modify") &&
        !scope.includes("gmail.send")
      ) {
        continue;
      }
      // Prefer users who already granted readonly or modify for pull.
      if (!scope.includes("gmail.readonly") && !scope.includes("gmail.modify")) continue;
      seen.add(row.userId);
      out.push(row.userId);
    }
    return out;
  }
};
