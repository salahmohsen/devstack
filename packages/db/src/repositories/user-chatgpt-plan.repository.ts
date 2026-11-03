import { randomUUID } from "node:crypto";

import { eq, sql, type InferSelectModel } from "drizzle-orm";

import { getDb } from "../index.ts";
import { userChatgptPlan } from "../schema/user-chatgpt-plan.schema.ts";

export type UserChatgptPlanEntity = InferSelectModel<typeof userChatgptPlan>;

export type ChatgptPlanConnectedPatch = {
  clientId: string;
  credentialsCiphertext: string;
  email: string | null;
  subject: string | null;
  planType: string | null;
  scopes: string[];
  accessExpiresAt: Date;
};

const CLEARED_PENDING = {
  pendingState: null,
  pendingVerifierCiphertext: null,
  pendingNonce: null,
  pendingExpiresAt: null
} as const;

export const userChatgptPlanRepository = {
  async findByUserId(userId: string): Promise<UserChatgptPlanEntity | null> {
    const [row] = await getDb()
      .select()
      .from(userChatgptPlan)
      .where(eq(userChatgptPlan.userId, userId))
      .limit(1);
    return row ?? null;
  },

  /** Creates the row on first use with a caller-supplied stable host id. */
  async ensure(userId: string, newHostId: string): Promise<UserChatgptPlanEntity> {
    await getDb()
      .insert(userChatgptPlan)
      .values({ id: randomUUID(), userId, hostId: newHostId })
      .onConflictDoNothing({ target: userChatgptPlan.userId });
    const row = await this.findByUserId(userId);
    if (!row) throw new Error("Failed to ensure user_chatgpt_plan");
    return row;
  },

  async setPending(
    userId: string,
    pending: {
      state: string;
      verifierCiphertext: string;
      nonce: string;
      expiresAt: Date;
    }
  ): Promise<void> {
    await getDb()
      .update(userChatgptPlan)
      .set({
        pendingState: pending.state,
        pendingVerifierCiphertext: pending.verifierCiphertext,
        pendingNonce: pending.nonce,
        pendingExpiresAt: pending.expiresAt
      })
      .where(eq(userChatgptPlan.userId, userId));
  },

  /** Single-use: sign-in attempt is consumed whether or not the exchange succeeds. */
  async takePending(userId: string): Promise<{
    state: string;
    verifierCiphertext: string;
    nonce: string;
    clientId: string | null;
    hostId: string;
    expiresAt: Date;
  } | null> {
    return getDb().transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(userChatgptPlan)
        .where(eq(userChatgptPlan.userId, userId))
        .for("update")
        .limit(1);
      if (
        !row?.pendingState ||
        !row.pendingVerifierCiphertext ||
        !row.pendingNonce ||
        !row.pendingExpiresAt
      ) {
        return null;
      }
      await tx
        .update(userChatgptPlan)
        .set(CLEARED_PENDING)
        .where(eq(userChatgptPlan.userId, userId));
      return {
        state: row.pendingState,
        verifierCiphertext: row.pendingVerifierCiphertext,
        nonce: row.pendingNonce,
        clientId: row.clientId,
        hostId: row.hostId,
        expiresAt: row.pendingExpiresAt
      };
    });
  },

  async saveConnected(userId: string, patch: ChatgptPlanConnectedPatch): Promise<void> {
    await getDb()
      .update(userChatgptPlan)
      .set({
        ...patch,
        ...CLEARED_PENDING,
        needsReconnect: false,
        lastErrorCode: null,
        lastErrorAt: null
      })
      .where(eq(userChatgptPlan.userId, userId));
  },

  async recordError(userId: string, code: string): Promise<void> {
    await getDb()
      .update(userChatgptPlan)
      .set({ lastErrorCode: code, lastErrorAt: new Date() })
      .where(eq(userChatgptPlan.userId, userId));
  },

  async clearError(userId: string): Promise<void> {
    await getDb()
      .update(userChatgptPlan)
      .set({ lastErrorCode: null, lastErrorAt: null })
      .where(eq(userChatgptPlan.userId, userId));
  },

  /** Drops tokens and identity; keeps host id and issued client id for the next sign-in. */
  async clearConnection(userId: string): Promise<void> {
    await getDb()
      .update(userChatgptPlan)
      .set({
        credentialsCiphertext: null,
        email: null,
        subject: null,
        planType: null,
        scopes: [],
        accessExpiresAt: null,
        needsReconnect: false,
        lastErrorCode: null,
        lastErrorAt: null,
        ...CLEARED_PENDING
      })
      .where(eq(userChatgptPlan.userId, userId));
  },

  /**
   * Cross-process lock per user (Postgres advisory lock held for the transaction), so the
   * rotating refresh token is never used by two refreshes at once.
   */
  async withCredentialsLock<T>(
    userId: string,
    fn: (ctx: {
      credentialsCiphertext: string | null;
      needsReconnect: boolean;
      save: (next: {
        credentialsCiphertext: string;
        scopes: string[];
        accessExpiresAt: Date;
      }) => Promise<void>;
      markNeedsReconnect: () => Promise<void>;
    }) => Promise<T>
  ): Promise<T> {
    return getDb().transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`chatgpt-plan:${userId}`}, 0))`
      );
      const [row] = await tx
        .select()
        .from(userChatgptPlan)
        .where(eq(userChatgptPlan.userId, userId))
        .limit(1);
      return fn({
        credentialsCiphertext: row?.credentialsCiphertext ?? null,
        needsReconnect: row?.needsReconnect ?? false,
        save: async (next) => {
          await tx
            .update(userChatgptPlan)
            .set({ ...next, needsReconnect: false })
            .where(eq(userChatgptPlan.userId, userId));
        },
        markNeedsReconnect: async () => {
          await tx
            .update(userChatgptPlan)
            .set({ needsReconnect: true, credentialsCiphertext: null })
            .where(eq(userChatgptPlan.userId, userId));
        }
      });
    });
  }
};
