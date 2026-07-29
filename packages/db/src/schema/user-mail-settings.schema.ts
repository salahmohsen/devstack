import { boolean, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { user } from "./auth.schema.ts";

/**
 * Per-user BYO Resend (Career Inbox ingress).
 * Secrets are AES-GCM sealed; API never returns ciphertext.
 * Webhook routing uses opaque `webhookToken` (not userId).
 */
export const userMailSettings = pgTable(
  "user_mail_settings",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Accept Resend inbound for this tenant when true and secrets are set. */
    inboundEnabled: boolean("inbound_enabled").notNull().default(false),
    /** Career receiving address on the user's Resend domain (soft-match). */
    inboundAddress: text("inbound_address"),
    resendApiKeyLast4: text("resend_api_key_last4"),
    resendApiKeyCiphertext: text("resend_api_key_ciphertext"),
    webhookSecretLast4: text("webhook_secret_last4"),
    webhookSecretCiphertext: text("webhook_secret_ciphertext"),
    /** Opaque path token for POST /webhooks/resend/:token */
    webhookToken: text("webhook_token").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date())
  },
  (t) => [
    uniqueIndex("user_mail_settings_user_id_unique_idx").on(t.userId),
    uniqueIndex("user_mail_settings_webhook_token_unique_idx").on(t.webhookToken)
  ]
);
