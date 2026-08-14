import { and, eq, sql, type InferSelectModel } from "drizzle-orm";

import { getDb } from "../index.ts";
import { userJobAiBudget } from "../schema/user-job-ai-budget.schema.ts";

export type UserJobAiBudgetEntity = InferSelectModel<typeof userJobAiBudget>;

export const userJobAiBudgetRepository = {
  async remainingAttempts(userId: string, dayUtc: string, cap: number): Promise<number> {
    if (cap <= 0) return 0;
    const [row] = await getDb()
      .select({ attempts: userJobAiBudget.attempts })
      .from(userJobAiBudget)
      .where(and(eq(userJobAiBudget.userId, userId), eq(userJobAiBudget.dayUtc, dayUtc)))
      .limit(1);
    return Math.max(0, cap - (row?.attempts ?? 0));
  },

  /**
   * Atomically consume one attempt if `attempts < cap`.
   * Inserts `attempts=1` on first use; conflict increments only while under cap.
   */
  async tryIncrement(userId: string, dayUtc: string, cap: number): Promise<boolean> {
    if (cap <= 0) return false;

    const [row] = await getDb()
      .insert(userJobAiBudget)
      .values({
        id: crypto.randomUUID(),
        userId,
        dayUtc,
        attempts: 1
      })
      .onConflictDoUpdate({
        target: [userJobAiBudget.userId, userJobAiBudget.dayUtc],
        set: { attempts: sql`${userJobAiBudget.attempts} + 1` },
        setWhere: sql`${userJobAiBudget.attempts} < ${cap}`
      })
      .returning({ id: userJobAiBudget.id });

    return Boolean(row);
  }
};
