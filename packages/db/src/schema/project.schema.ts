import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex
} from "drizzle-orm/pg-core";

import { experience } from "./experience.schema.ts";
import { portfolioEntry } from "./portfolio-entry.schema.ts";
import { stack } from "./stack.schema.ts";

export const project = pgTable(
  "project",
  {
    id: text("id").primaryKey(),
    logo: text("logo"),
    repos: text("repos").array(),
    demoUrl: text("demo_url"),
    year: integer("year").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    description: text("description").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isArchived: boolean("is_archived").default(false),
    experienceId: text("experience_id").references(() => experience.id, {
      onDelete: "set null"
    }),
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
    index("project_sort_order_idx").on(table.sortOrder),
    index("project_experience_id_idx").on(table.experienceId),
    index("project_portfolio_entry_id_idx").on(table.portfolioEntryId)
  ]
);

export const projectStack = pgTable(
  "project_stack",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    stackId: text("stack_id")
      .notNull()
      .references(() => stack.id, { onDelete: "cascade" })
  },
  (table) => [
    index("project_stack_project_id_idx").on(table.projectId),
    index("project_stack_stack_id_idx").on(table.stackId),
    uniqueIndex("project_stack_project_id_stack_id_unique_idx").on(table.projectId, table.stackId)
  ]
);
