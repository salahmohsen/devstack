import { index, jsonb, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { application } from "./application.schema.ts";
import { user } from "./auth.schema.ts";

/**
 * Unified timeline for New jobs / Tracked jobs: system events + user notes.
 * @see docs/superpowers/specs/2026-08-11-new-jobs-tracked-jobs-design.md
 */
export const applicationActivityKindEnum = pgEnum("application_activity_kind", [
  "discovered",
  "promoted",
  "dismissed",
  "restored",
  "note",
  "stage_changed",
  "outcome_set",
  "package_generated"
]);

export const applicationActivity = pgTable(
  "application_activity",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    applicationId: text("application_id")
      .notNull()
      .references(() => application.id, { onDelete: "cascade" }),
    kind: applicationActivityKindEnum("kind").notNull(),
    /** Note body; optional for system kinds. */
    body: text("body"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    /** Null = system / AI. */
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    index("application_activity_application_id_created_at_idx").on(t.applicationId, t.createdAt),
    index("application_activity_user_id_application_id_idx").on(t.userId, t.applicationId)
  ]
);

export type ApplicationActivityKind = (typeof applicationActivityKindEnum.enumValues)[number];
