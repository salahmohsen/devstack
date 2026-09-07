import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { user } from "./auth.schema.ts";

/**
 * Per-user staging row for freehire job results. One row per (user, slug);
 * unchanged rows only bump `lastSeenAt`. Landed rows live in `application`.
 */
export const userJob = pgTable(
  "user_job",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    freehireSlug: text("freehire_slug").notNull(),
    title: text("title").notNull(),
    companyName: text("company_name").notNull(),
    companySlug: text("company_slug"),
    companyLogoUrl: text("company_logo_url"),
    listingUrl: text("listing_url").notNull(),
    location: text("location"),
    workMode: text("work_mode"),
    employmentType: text("employment_type"),
    seniority: text("seniority"),
    experienceYearsMin: integer("experience_years_min"),
    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    salaryCurrency: text("salary_currency"),
    skills: jsonb("skills").$type<string[]>().notNull().default([]),
    /** Freehire job-level tech flag ("tech" | "non-tech"); passthrough today, gate later. */
    isTech: text("is_tech"),
    category: text("category"),
    domains: jsonb("domains").$type<string[]>().notNull().default([]),
    summary: text("summary"),
    description: text("description"),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    reality: text("reality"),
    source: text("source"),
    queryHash: text("query_hash").notNull(),
    queryFilters: jsonb("query_filters").$type<Record<string, unknown>>().notNull(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("user_job_user_slug_uidx").on(table.userId, table.freehireSlug),
    index("user_job_user_seen_idx").on(table.userId, table.lastSeenAt),
    index("user_job_user_query_idx").on(table.userId, table.queryHash)
  ]
);
