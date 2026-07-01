import { pgEnum, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "#@/schema/auth.schema";

export const contactTypeEnum = pgEnum("contact_type_enum", [
  "website",
  "email",
  "location",
  "linkedin",
  "github",
  "x",
  "youtube"
]);

export const contact = pgTable(
  "contact",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: contactTypeEnum("type").notNull(),
    value: text("value").notNull(),
    icon: text("icon").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull()
  },
  (table) => [primaryKey({ columns: [table.userId, table.type] })]
);
