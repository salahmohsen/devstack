import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { experience } from "#@/schema/experience.schema";

export const project = pgTable(
  "project",
  {
    id: text("id").primaryKey(),
    logo: text("logo"),
    year: integer("year").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    fromDate: text("from_date"),
    toDate: text("to_date"),
    sortOrder: integer("sort_order").notNull().default(0),
    experienceId: text("experience_id").references(() => experience.id, {
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
    name: text("name").notNull(),
    iconUrl: text("icon_url")
  },
  (table) => [index("project_stack_project_id_idx").on(table.projectId)]
);
