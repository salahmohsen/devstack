import { index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const githubResponseCache = pgTable(
  "github_response_cache",
  {
    cacheKey: text("cache_key").primaryKey(),
    namespace: text("namespace").notNull(),
    owner: text("owner").notNull(),
    namespaceVersion: integer("namespace_version").default(0).notNull(),
    status: integer("status").default(200).notNull(),
    etag: text("etag"),
    lastModified: text("last_modified"),
    payload: jsonb("payload").notNull(),
    fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
    staleAt: timestamp("stale_at"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull()
  },
  (table) => [
    index("github_response_cache_namespace_idx").on(table.namespace),
    index("github_response_cache_owner_idx").on(table.owner)
  ]
);

export const githubRevalidationSignal = pgTable("github_revalidation_signal", {
  signalKey: text("signal_key").primaryKey(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull()
});

export const githubCacheNamespace = pgTable("github_cache_namespace", {
  namespace: text("namespace").primaryKey(),
  version: integer("version").default(0).notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull()
});

export const githubWebhookEvent = pgTable(
  "github_webhook_event",
  {
    deliveryId: text("delivery_id").primaryKey(),
    event: text("event").notNull(),
    action: text("action"),
    scope: text("scope"),
    payload: jsonb("payload"),
    receivedAt: timestamp("received_at").defaultNow().notNull(),
    processedAt: timestamp("processed_at")
  },
  (table) => [index("github_webhook_event_event_idx").on(table.event)]
);
