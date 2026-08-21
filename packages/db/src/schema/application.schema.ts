import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex
} from "drizzle-orm/pg-core";

import { user } from "./auth.schema.ts";
import { jobPosting } from "./job-posting.schema.ts";
import { type StoredWorkMode } from "./job-preference.schema.ts";
import { resume } from "./resume.schema.ts";

/** Persisted skill tag on an application (required vs preferred). */
export type ApplicationJobSkillTag = {
  name: string;
  stackId: string | null;
  band: "required" | "preferred";
};

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

export const employmentTypeEnum = pgEnum("employment_type", [
  "unknown",
  "full_time",
  "part_time",
  "contract",
  "internship"
]);

/** New jobs inbox vs tracked CRM pipeline vs soft-dismissed discoveries. */
export const applicationTrackingStatusEnum = pgEnum("application_tracking_status", [
  "inbox",
  "tracked",
  "dismissed"
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
    /**
     * Free-text platform label when `source` is `other` (e.g. "Jack & Jill").
     * Not an enum member — allowlist stays closed.
     */
    sourceLabel: text("source_label"),
    /**
     * Multi-source chips: channel (mail|hub|manual) + platform (linkedin|…).
     * Prefer this over single `source` for new UI.
     */
    sourceTags: text("source_tags").array().notNull().default([]),
    location: text("location"),
    workMode: text("work_mode").$type<StoredWorkMode>(),
    hiringRegion: text("hiring_region"),
    requiredSkills: jsonb("required_skills")
      .$type<ApplicationJobSkillTag[]>()
      .notNull()
      .default([]),
    preferredSkills: jsonb("preferred_skills")
      .$type<ApplicationJobSkillTag[]>()
      .notNull()
      .default([]),
    salaryRange: text("salary_range"),
    employmentType: employmentTypeEnum("employment_type").notNull().default("unknown"),
    /** Denorm from posting at land; stable after catalog close. */
    experienceYearsMin: integer("experience_years_min"),
    companyLogoUrl: text("company_logo_url"),
    description: text("description"),
    notes: text("notes"),
    /** AI narrative fit blurb (harvest agent take). */
    agentTake: text("agent_take"),
    /**
     * Harvest provenance — Career Inbox message id.
     * FK enforced in migration (avoids circular import with mail_message).
     */
    sourceMessageId: text("source_message_id"),
    trackingStatus: applicationTrackingStatusEnum("tracking_status").notNull().default("tracked"),
    stage: applicationStageEnum("stage").notNull().default("saved"),
    stageChangedAt: timestamp("stage_changed_at", { withTimezone: true }).notNull().defaultNow(),
    outcome: applicationOutcomeEnum("outcome"),
    outcomeAt: timestamp("outcome_at", { withTimezone: true }),
    hiringUrgency: hiringUrgencyEnum("hiring_urgency").notNull().default("unknown"),
    resumeId: text("resume_id").references(() => resume.id, { onDelete: "set null" }),
    /** Shared catalog row; null for manual/hub/mail. */
    postingId: text("posting_id").references(() => jobPosting.id, { onDelete: "set null" }),
    /** Inbox TTL; null = grandfathered (pre-discovery). */
    inboxExpiresAt: timestamp("inbox_expires_at", { withTimezone: true }),
    /** Land/discovery batch id for this inbox row. */
    discoveryRunId: text("discovery_run_id"),
    /** Recruiter / hiring contact email for outreach. */
    recruiterEmail: text("recruiter_email"),
    coverLetterBody: text("cover_letter_body"),
    coverLetterR2Key: text("cover_letter_r2_key"),
    coverLetterFilename: text("cover_letter_filename"),
    outreachSubject: text("outreach_subject"),
    outreachBody: text("outreach_body"),
    outreachSentAt: timestamp("outreach_sent_at", { withTimezone: true }),
    outreachProviderMessageId: text("outreach_provider_message_id"),
    /** Transient AI draft payload; cleared on accept. */
    applyPackageDraft: jsonb("apply_package_draft").$type<unknown>(),
    applyPackageDraftedAt: timestamp("apply_package_drafted_at", { withTimezone: true }),
    fitAnalysis: jsonb("fit_analysis").$type<unknown>(),
    fitAnalysisPackageHash: text("fit_analysis_package_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date())
  },
  (table) => [
    index("application_user_id_idx").on(table.userId),
    index("application_user_id_stage_idx").on(table.userId, table.stage),
    index("application_user_id_tracking_status_idx").on(table.userId, table.trackingStatus),
    index("application_user_id_discovery_run_id_idx").on(table.userId, table.discoveryRunId),
    index("application_posting_id_idx").on(table.postingId),
    // Partial unique: manual apps may omit url (multiple nulls allowed).
    uniqueIndex("application_user_id_url_uidx")
      .on(table.userId, table.url)
      .where(sql`${table.url} is not null`)
  ]
);

export type ApplicationStage = (typeof applicationStageEnum.enumValues)[number];
export type ApplicationOutcome = (typeof applicationOutcomeEnum.enumValues)[number];
export type HiringUrgency = (typeof hiringUrgencyEnum.enumValues)[number];
export type ApplicationSource = (typeof applicationSourceEnum.enumValues)[number];
export type ApplicationApplyMethod = (typeof applicationApplyMethodEnum.enumValues)[number];
export type EmploymentType = (typeof employmentTypeEnum.enumValues)[number];
export type ApplicationTrackingStatus = (typeof applicationTrackingStatusEnum.enumValues)[number];
