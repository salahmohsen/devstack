import { jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { user } from "./auth.schema.ts";

export const mailReplyAutonomyEnum = pgEnum("mail_reply_autonomy_enum", ["assist", "full"]);

/**
 * Stored provider secret material — never expose ciphertext via API.
 * Public shape uses hasApiKey + last4 only.
 */
export type StoredAiProvider = {
  id: string;
  /** Mastra model-router provider id (e.g. openai, deepseek) or `custom`. */
  kind: string;
  label: string;
  apiKeyLast4: string | null;
  /** AES-GCM sealed blob (base64). Null if no key set. */
  apiKeyCiphertext: string | null;
};

export type StoredAiModels = {
  classify: string;
  reply: string;
  resumeImport: string;
  stacks: string;
  hubChat: string;
  scorer: string;
  /** Optional so pre-existing rows without this key still typecheck. */
  applyPackage?: string;
};

/**
 * Per-feature provider row id binding (which key row supplies generate/test).
 * Aligns with core `AiModelProviderIdsMap` — all keys optional; empty object is default.
 */
export type StoredAiModelProviderIds = {
  classify?: string;
  reply?: string;
  resumeImport?: string;
  stacks?: string;
  hubChat?: string;
  scorer?: string;
  applyPackage?: string;
};

/**
 * Per-user AI platform settings: providers (BYO keys), models per feature,
 * mail reply Assist|Full. One row per user.
 */
export const userAiSettings = pgTable(
  "user_ai_settings",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    providers: jsonb("providers").$type<StoredAiProvider[]>().notNull().default([]),
    models: jsonb("models").$type<StoredAiModels>().notNull(),
    /** Feature → provider row id; empty for legacy rows / unbound features. */
    modelProviderIds: jsonb("model_provider_ids")
      .$type<StoredAiModelProviderIds>()
      .notNull()
      .default({}),
    mailReplyAutonomy: mailReplyAutonomyEnum("mail_reply_autonomy").notNull().default("assist"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date())
  },
  (t) => [uniqueIndex("user_ai_settings_user_id_unique_idx").on(t.userId)]
);

export type MailReplyAutonomyDb = (typeof mailReplyAutonomyEnum.enumValues)[number];
