import { boolean, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { user } from "./auth.schema.ts";

/**
 * Owner's ChatGPT plan connection (Sign in with ChatGPT, plan usage).
 * Tokens live only in `credentialsCiphertext` (AES-GCM sealed JSON); never returned by the API.
 */
export const userChatgptPlan = pgTable(
  "user_chatgpt_plan",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Opaque `ext_agent_host_id`; stable across sign-ins and disconnects. */
    hostId: text("host_id").notNull(),
    /** Issued `oaiapp_...` client id; kept across disconnects so re-sign-in reuses it. */
    clientId: text("client_id"),
    credentialsCiphertext: text("credentials_ciphertext"),
    email: text("email"),
    subject: text("subject"),
    planType: text("plan_type"),
    scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
    accessExpiresAt: timestamp("access_expires_at", { withTimezone: true }),
    needsReconnect: boolean("needs_reconnect").notNull().default(false),
    lastErrorCode: text("last_error_code"),
    lastErrorAt: timestamp("last_error_at", { withTimezone: true }),
    pendingState: text("pending_state"),
    pendingVerifierCiphertext: text("pending_verifier_ciphertext"),
    pendingNonce: text("pending_nonce"),
    pendingExpiresAt: timestamp("pending_expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date())
  },
  (t) => [uniqueIndex("user_chatgpt_plan_user_id_unique_idx").on(t.userId)]
);
