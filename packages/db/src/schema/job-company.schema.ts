import { integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * Shared company catalog for job postings (no tenant).
 * One row per normalized company slug.
 */
export const jobCompany = pgTable(
  "job_company",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    logoUrl: text("logo_url"),
    website: text("website"),
    tagline: text("tagline"),
    employeeCount: integer("employee_count"),
    companySize: text("company_size"),
    companyType: text("company_type"),
    hqCountry: text("hq_country"),
    profile: jsonb("profile").$type<Record<string, unknown>>().notNull().default({}),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date())
  },
  (table) => [uniqueIndex("job_company_slug_uidx").on(table.slug)]
);
