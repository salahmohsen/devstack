import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex
} from "drizzle-orm/pg-core";

import { experience } from "#@/schema/experience.schema";
import { stack } from "#@/schema/stack.schema";

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
    enableAi: boolean("enable_ai").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date())
  },
  (table) => [
    index("project_sort_order_idx").on(table.sortOrder),
    index("project_experience_id_idx").on(table.experienceId)
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
