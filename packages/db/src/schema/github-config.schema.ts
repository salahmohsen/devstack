import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "#@/schema/auth.schema";

export const githubConfig = pgTable(
  "github_config",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    githubToken: text("github_token"),
    githubUsername: text("github_username"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull()
  },
  (table) => [index("github_config_githubUsername_idx").on(table.githubUsername)]
);
