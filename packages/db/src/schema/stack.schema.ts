import {
  boolean,
  index,
  integer,
  json,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex
} from "drizzle-orm/pg-core";

import { user } from "./auth.schema.ts";
import { portfolioEntry } from "./portfolio-entry.schema.ts";

/** Tenant skill catalog. Product UI: Skills. Project tech stays on `project_stack`. */
export const stack = pgTable(
  "skill",
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
    alternativeNames: jsonb("alternative_names").$type<string[]>().notNull().default([]),
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
    uniqueIndex("skill_user_id_name_unique_idx").on(table.userId, table.name),
    index("skill_user_id_sort_order_idx").on(table.userId, table.sortOrder),
    index("skill_portfolio_entry_id_idx").on(table.portfolioEntryId)
  ]
);
