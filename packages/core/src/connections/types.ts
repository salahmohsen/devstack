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

export const ConnectionsStatusOutputSchema = z.object({
  google: ProviderConnectionStatusSchema,
  github: ProviderConnectionStatusSchema,
  gmailSync: GmailSyncStatusSchema
});
export type ConnectionsStatusOutput = z.infer<typeof ConnectionsStatusOutputSchema>;
