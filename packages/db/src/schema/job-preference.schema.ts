import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex
} from "drizzle-orm/pg-core";

import { user } from "./auth.schema.ts";

export type StoredWorkMode = "remote" | "hybrid" | "onsite";

export type StoredLevelFloor = "junior" | "mid" | "senior" | "staff";

/**
 * Per-user job preferences for mail harvest / match scoring.
 * One active profile per user (unique on user_id).
 */
export const jobPreference = pgTable(
  "job_preference",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    workModes: jsonb("work_modes").$type<StoredWorkMode[]>().notNull().default([]),
    locations: jsonb("locations").$type<string[]>().notNull().default([]),
    remoteRegions: jsonb("remote_regions").$type<string[]>().notNull().default([]),
    roleKeywords: jsonb("role_keywords").$type<string[]>().notNull().default([]),
    excludeKeywords: jsonb("exclude_keywords").$type<string[]>().notNull().default([]),
    salaryMin: integer("salary_min"),
    salaryCurrency: text("salary_currency"),
    levelFloor: text("level_floor").$type<StoredLevelFloor>(),
    searchBriefMarkdown: text("search_brief_markdown"),
    searchBriefHash: text("search_brief_hash"),
    searchBriefPreviousMarkdown: text("search_brief_previous_markdown"),
    searchBriefBuiltAt: timestamp("search_brief_built_at", { withTimezone: true }),
    minMatchScore: integer("min_match_score").notNull().default(60),
    titleId: text("title_id"),
    customTitle: text("custom_title"),
    jobsPerRun: integer("jobs_per_run").notNull().default(25),
    dailyBoardScoreCap: integer("daily_board_score_cap").notNull().default(50),
    importFromEmail: boolean("import_from_email").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date())
  },
  (t) => [uniqueIndex("job_preference_user_id_unique_idx").on(t.userId)]
);
