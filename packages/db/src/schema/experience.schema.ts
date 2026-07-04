import { boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { portfolioEntry } from "#@/schema/portfolio-entry.schema";

export const experience = pgTable(
  "experience",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    organization: text("organization").notNull(),
    description: text("description").notNull(),
    fromDate: text("from_date"),
    toDate: text("to_date"),
    sortOrder: integer("sort_order").notNull().default(0),
    isPresent: boolean("is_present").default(false),
    portfolioEntryId: text("portfolio_entry_id").references(() => portfolioEntry.id, {
      onDelete: "set null"
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date())
  },
  (table) => [
    index("experience_sort_order_idx").on(table.sortOrder),
    index("experience_portfolio_entry_id_idx").on(table.portfolioEntryId)
  ]
);
