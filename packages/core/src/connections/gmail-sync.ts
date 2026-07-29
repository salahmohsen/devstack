import { z } from "zod";

export const GmailSyncResultSchema = z.object({
  imported: z.number().int().min(0),
  skipped: z.number().int().min(0),
  historyId: z.string().nullable(),
  emailAddress: z.string().nullable(),
  messageIds: z.array(z.string())
});
export type GmailSyncResult = z.infer<typeof GmailSyncResultSchema>;

export const GmailSyncStatusSchema = z.object({
  connected: z.boolean(),
  gmailConnected: z.boolean(),
  emailAddress: z.string().nullable(),
  historyId: z.string().nullable(),
  lastSyncedAt: z.coerce.date().nullable(),
  lastError: z.string().nullable()
});
export type GmailSyncStatus = z.infer<typeof GmailSyncStatusSchema>;
