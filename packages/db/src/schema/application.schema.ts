import { index, integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth.schema.ts";
import { resume } from "./resume.schema.ts";

export const applicationStageEnum = pgEnum("application_stage", [
  "saved",
  "applied",
  "screening",
  "interview",
  "offer"
]);

export const applicationOutcomeEnum = pgEnum("application_outcome", [
  "rejected",
  "withdrawn",
  "ghosted",
  "accepted"
]);

export const hiringUrgencyEnum = pgEnum("hiring_urgency", [
  "unknown",
  "immediate",
  "soon",
  "flexible"
]);

export const applicationSourceEnum = pgEnum("application_source", [
  "linkedin",
  "indeed",
  "company_website",
  "referral",
  "recruiter",
  "other"
]);

export const applicationApplyMethodEnum = pgEnum("application_apply_method", [
  "easy_apply",
  "external",
  "email",
  "unknown"
]);

export const application = pgTable(
  "application",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    companyName: text("company_name").notNull(),
    title: text("title").notNull(),
    /** Listing / source URL (not the external apply destination). */
    url: text("url"),
    /** External apply destination when applyMethod is external (or known). */
    applyUrl: text("apply_url"),
    applyMethod: applicationApplyMethodEnum("apply_method").notNull().default("unknown"),
    /** 0–100 match score; null when unscored. */
    matchScore: integer("match_score"),
    source: applicationSourceEnum("source"),
    location: text("location"),
    salaryRange: text("salary_range"),
    description: text("description"),
    notes: text("notes"),
    stage: applicationStageEnum("stage").notNull().default("saved"),
    stageChangedAt: timestamp("stage_changed_at", { withTimezone: true }).notNull().defaultNow(),
    outcome: applicationOutcomeEnum("outcome"),
    outcomeAt: timestamp("outcome_at", { withTimezone: true }),
    hiringUrgency: hiringUrgencyEnum("hiring_urgency").notNull().default("unknown"),
    resumeId: text("resume_id").references(() => resume.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date())
  },
  (table) => [
    index("application_user_id_idx").on(table.userId),
    index("application_user_id_stage_idx").on(table.userId, table.stage)
  ]
);

export type ApplicationStage = (typeof applicationStageEnum.enumValues)[number];
export type ApplicationOutcome = (typeof applicationOutcomeEnum.enumValues)[number];
export type HiringUrgency = (typeof hiringUrgencyEnum.enumValues)[number];
export type ApplicationSource = (typeof applicationSourceEnum.enumValues)[number];
export type ApplicationApplyMethod = (typeof applicationApplyMethodEnum.enumValues)[number];
