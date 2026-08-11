import { pgEnum, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth.schema.ts";
import { portfolioEntry } from "./portfolio-entry.schema.ts";

export const contactTypeEnum = pgEnum("contact_type_enum", [
  "website",
  "email",
  "phone",
  "location",
  "linkedin",
  "github",
  "x",
  "youtube",
  "instagram",
  "discord",
  "bluesky",
  "mastodon",
  "telegram"
]);

export const contact = pgTable(
  "contact",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: contactTypeEnum("type").notNull(),
    value: text("value").notNull(),
    portfolioEntryId: text("portfolio_entry_id").references(() => portfolioEntry.id, {
      onDelete: "set null"
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull()
  },
  (table) => [primaryKey({ columns: [table.userId, table.type] })]
);
