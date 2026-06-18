import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date())
  },
  (table) => [index("experience_sort_order_idx").on(table.sortOrder)]
);
