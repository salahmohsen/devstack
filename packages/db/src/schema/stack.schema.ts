import {
  boolean,
  index,
  integer,
  json,
  pgTable,
  text,
  timestamp,
  uniqueIndex
} from "drizzle-orm/pg-core";

import { user } from "./auth.schema.ts";
import { portfolioEntry } from "./portfolio-entry.schema.ts";

export const stack = pgTable(
  "stack",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    icon: text("icon"),
    type: text("type"),
    healthStatus: json("health_status").$type<{
      deprecated?: boolean;
      downloads?: number;
      lastPublished?: string;
    }>(),
    confidence: text("confidence"),
    sortOrder: integer("sort_order").notNull().default(0),
    isFeatured: boolean("is_featured").notNull().default(false),
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
    uniqueIndex("stack_user_id_name_unique_idx").on(table.userId, table.name),
    index("stack_user_id_sort_order_idx").on(table.userId, table.sortOrder),
    index("stack_portfolio_entry_id_idx").on(table.portfolioEntryId)
  ]
);
