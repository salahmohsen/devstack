import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * Shared job listing catalog (no tenant). One row per adapter+external id.
 * Personal score/take never land here — only HTTP/ATS fields.
 */
export const jobPosting = pgTable(
  "job_posting",
  {
    id: text("id").primaryKey(),
    adapterId: text("adapter_id").notNull(),
    externalId: text("external_id").notNull(),
    listingUrl: text("listing_url").notNull(),
    title: text("title").notNull(),
    companyName: text("company_name").notNull(),
    location: text("location"),
    workMode: text("work_mode"),
    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    salaryCurrency: text("salary_currency"),
    skills: jsonb("skills").$type<string[]>().notNull().default([]),
    description: text("description"),
    sourcePlatform: text("source_platform"),
    contentHash: text("content_hash").notNull(),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    raw: jsonb("raw")
  },
  (table) => [
    uniqueIndex("job_posting_adapter_external_uidx").on(table.adapterId, table.externalId),
    index("job_posting_listing_url_idx").on(table.listingUrl),
    index("job_posting_closed_at_idx").on(table.closedAt)
  ]
);
