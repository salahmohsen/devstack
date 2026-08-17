import { eq, sql, type InferSelectModel } from "drizzle-orm";

import { getDb } from "../index.ts";
import { userHubState } from "../schema/user-hub-state.schema.ts";

export type UserHubStateEntity = InferSelectModel<typeof userHubState>;

export const userHubStateRepository = {
  async get(userId: string): Promise<UserHubStateEntity | null> {
    const [row] = await getDb()
      .select()
      .from(userHubState)
      .where(eq(userHubState.userId, userId))
      .limit(1);
    return row ?? null;
  },

  /** Current hub chat epoch (0 when no row yet). */
  async getHubChatEpoch(userId: string): Promise<number> {
    const row = await this.get(userId);
    return row?.hubChatEpoch ?? 0;
  },

  async markDailyBriefOpened(userId: string, at: Date = new Date()): Promise<UserHubStateEntity> {
    const [row] = await getDb()
      .insert(userHubState)
      .values({
        userId,
        dailyBriefOpenedAt: at,
        updatedAt: at
      })
      .onConflictDoUpdate({
        target: userHubState.userId,
        set: {
          dailyBriefOpenedAt: at,
          updatedAt: at
        }
      })
      .returning();
    if (!row) {
      throw new Error("userHubStateRepository.markDailyBriefOpened: upsert returned no row");
    }
    return row;
  },

  /**
   * Start a fresh hub chat memory thread for this user.
   * Bumps `hubChatEpoch` so Mastra thread id rotates; old history stays on prior ids.
   */
  async startHubChatSession(userId: string, at: Date = new Date()): Promise<UserHubStateEntity> {
    const [row] = await getDb()
      .insert(userHubState)
      .values({
        userId,
        hubChatEpoch: 1,
        updatedAt: at
      })
      .onConflictDoUpdate({
        target: userHubState.userId,
        set: {
          hubChatEpoch: sql`${userHubState.hubChatEpoch} + 1`,
          updatedAt: at
        }
      })
      .returning();
    if (!row) {
      throw new Error("userHubStateRepository.startHubChatSession: upsert returned no row");
    }
    return row;
  }
};
