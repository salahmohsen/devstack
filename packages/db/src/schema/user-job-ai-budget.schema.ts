import { integer, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";

import { user } from "./auth.schema.ts";

/**
 * Per-user UTC-day AI attempt counter for discovery / harvest.
 * Cap is computed in core (`2 * jobsPerRun`), not stored here.
 */
export const userJobAiBudget = pgTable(
  "user_job_ai_budget",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** UTC calendar day `YYYY-MM-DD`. */
    dayUtc: text("day_utc").notNull(),
    attempts: integer("attempts").notNull().default(0)
  },
  (t) => [uniqueIndex("user_job_ai_budget_user_id_day_utc_uidx").on(t.userId, t.dayUtc)]
);
