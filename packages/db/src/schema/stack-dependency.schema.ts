import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { stack } from "./stack.schema.ts";

export const stackDependency = pgTable(
  "stack_dependency",
  {
    id: text("id").primaryKey(),
    stackId: text("stack_id")
      .notNull()
      .references(() => stack.id, { onDelete: "cascade" }),
    npmPackage: text("npm_package").notNull(),
    description: text("description"),
    version: text("version"),
    homepage: text("homepage"),
    lastRefreshedAt: timestamp("last_refreshed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date())
  },
  (table) => [
    uniqueIndex("stack_dependency_npm_package_unique_idx").on(table.npmPackage),
    index("stack_dependency_stack_id_idx").on(table.stackId)
  ]
);
