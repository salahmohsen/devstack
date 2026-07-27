import { index, pgEnum, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { user } from "./auth.schema.ts";

export const portfolioEntryTypeEnum = pgEnum("portfolio_entry_type_enum", [
  "experience",
  "project",
  "stack",
  "contact"
]);

export const portfolioEntry = pgTable(
  "portfolio_entry",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: portfolioEntryTypeEnum("type").notNull(),
    entityId: text("entity_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date())
  },
  (table) => [
    uniqueIndex("portfolio_entry_user_id_type_entity_id_unique_idx").on(
      table.userId,
      table.type,
      table.entityId
    ),
    index("portfolio_entry_user_id_idx").on(table.userId)
  ]
);

export type PortfolioEntryType = (typeof portfolioEntryTypeEnum.enumValues)[number];
