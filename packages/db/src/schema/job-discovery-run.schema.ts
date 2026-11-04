import { sql } from "drizzle-orm";
import {
  index,
  integer,
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex
} from "drizzle-orm/pg-core";

import { user } from "./auth.schema.ts";

export const jobDiscoveryRun = pgTable(
  "job_discovery_run",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    runId: text("run_id").notNull(),
    stage: text("stage").notNull().default("queued"),
    reason: text("reason"),
    fetched: integer("fetched").notNull().default(0),
    queryHash: text("query_hash"),
    candidates: jsonb("candidates").$type<Record<string, string>>().notNull().default({}),
    warnings: jsonb("warnings").$type<string[]>().notNull().default([]),
    landRevision: integer("land_revision").notNull().default(0),
    landFinished: boolean("land_finished").notNull().default(false),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull().defaultNow(),
    retryAt: timestamp("retry_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    uniqueIndex("job_discovery_run_user_run_idx").on(t.userId, t.runId),
    uniqueIndex("job_discovery_run_active_user_idx")
      .on(t.userId)
      .where(sql`${t.stage} not in ('completed', 'failed')`),
    index("job_discovery_run_user_created_idx").on(t.userId, t.createdAt)
  ]
);
