import { pgEnum, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { user } from "./auth.schema.ts";

export const customDomainStatusEnum = pgEnum("custom_domain_status_enum", [
  "pending",
  "verified",
  "failed"
]);

/**
 * Optional verified custom hostname for a user's public portfolio.
 * v1: at most one row per user (unique on userId); hostname unique globally.
 * Only `status=verified` participates in Host routing.
 */
export const userCustomDomain = pgTable(
  "user_custom_domain",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    hostname: text("hostname").notNull(),
    status: customDomainStatusEnum("status").notNull().default("pending"),
    verificationToken: text("verification_token").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date())
  },
  (t) => [
    uniqueIndex("user_custom_domain_hostname_unique_idx").on(t.hostname),
    uniqueIndex("user_custom_domain_user_id_unique_idx").on(t.userId)
  ]
);

export type CustomDomainStatus = (typeof customDomainStatusEnum.enumValues)[number];
