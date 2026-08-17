import { eq, type InferSelectModel } from "drizzle-orm";

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
  }
};
