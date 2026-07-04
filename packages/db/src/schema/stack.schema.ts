import { index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { portfolioEntry } from "#@/schema/portfolio-entry.schema";

export const stack = pgTable(
  "stack",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    icon: text("icon"),
    sortOrder: integer("sort_order").notNull().default(0),
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
    uniqueIndex("stack_name_unique_idx").on(table.name),
    index("stack_sort_order_idx").on(table.sortOrder),
    index("stack_portfolio_entry_id_idx").on(table.portfolioEntryId)
  ]
);
