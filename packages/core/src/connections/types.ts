import { z } from "zod";

import { GmailSyncStatusSchema } from "./gmail-sync";

export const ProviderConnectionStatusSchema = z.object({
  providerId: z.enum(["google", "github"]),
  /** Provider is linked on the Better Auth account table. */
  connected: z.boolean(),
  /** OAuth account id (provider subject) when connected. */
  accountId: z.string().nullable(),
  /** Raw scope string from the account row (space-separated). */
  scope: z.string().nullable(),
  /** Google only: token includes Gmail API scopes. */
  gmailConnected: z.boolean().optional(),
  /** Whether server has OAuth client credentials configured. */
  available: z.boolean()
});
export type ProviderConnectionStatus = z.infer<typeof ProviderConnectionStatusSchema>;

/** GitHub-specific facts for Settings → Connections (no live API call). */
export const GithubConnectionStatusSchema = ProviderConnectionStatusSchema.extend({
  /** Stored GitHub login (`github_config`), not the numeric OAuth subject. */
  username: z.string().nullable(),
  tokenExpiresAt: z.coerce.date().nullable(),
  lastRefreshedAt: z.coerce.date().nullable()
});
export type GithubConnectionStatus = z.infer<typeof GithubConnectionStatusSchema>;

export const ConnectionsStatusOutputSchema = z.object({
  google: ProviderConnectionStatusSchema,
  github: GithubConnectionStatusSchema,
  gmailSync: GmailSyncStatusSchema
});
export type ConnectionsStatusOutput = z.infer<typeof ConnectionsStatusOutputSchema>;

export const RefreshGithubConnectionOutputSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true) }),
  z.object({
    ok: z.literal(false),
    reason: z.enum(["not_connected", "needs_reauth"])
  })
]);
export type RefreshGithubConnectionOutput = z.infer<typeof RefreshGithubConnectionOutputSchema>;
