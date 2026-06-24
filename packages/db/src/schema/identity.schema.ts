import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

export const portfolioIdentitySourceEnum = pgEnum("portfolio_identity_source", [
  "github",
  "manual",
  "conversation",
  "seed"
]);

export const portfolioIdentityFacets = pgTable("portfolio_identity_facets", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  version: integer("version").notNull().default(1),
  source: portfolioIdentitySourceEnum("source").notNull(),
  sourceRef: text("source_ref"),
  reason: text("reason").notNull(),
  updatedBy: text("updated_by").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .$onUpdate(() => new Date())
    .notNull()
    .defaultNow()
});

export const portfolioIdentityRevisions = pgTable(
  "portfolio_identity_revisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    facetKey: text("facet_key")
      .notNull()
      .references(() => portfolioIdentityFacets.key, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    value: jsonb("value").notNull(),
    source: portfolioIdentitySourceEnum("source").notNull(),
    sourceRef: text("source_ref"),
    reason: text("reason").notNull(),
    actor: text("actor").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    index("identity_revisions_facet_idx").on(t.facetKey, t.version),
    index("identity_revisions_created_idx").on(t.createdAt),
    uniqueIndex("identity_revisions_source_ref_unique_idx")
      .on(t.facetKey, t.source, t.sourceRef)
      .where(sql`${t.sourceRef} IS NOT NULL`)
  ]
);

export const portfolioIdentityProposals = pgTable(
  "portfolio_identity_proposals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    facetKey: text("facet_key")
      .notNull()
      .references(() => portfolioIdentityFacets.key, { onDelete: "cascade" }),
    proposedValue: jsonb("proposed_value").notNull(),
    currentValue: jsonb("current_value").notNull(),
    confidence: real("confidence").notNull(),
    reason: text("reason").notNull(),
    source: portfolioIdentitySourceEnum("source").notNull(),
    sourceRef: text("source_ref"),
    status: text("status").notNull().default("open"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: text("resolved_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    index("identity_proposals_status_idx").on(t.status, t.createdAt),
    index("identity_proposals_facet_idx").on(t.facetKey)
  ]
);
