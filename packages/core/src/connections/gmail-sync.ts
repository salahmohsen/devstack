import { z } from "zod";

/** BullMQ queue for scheduled / background Gmail inbox sync. */
export const GMAIL_SYNC_QUEUE_NAME = "gmail-sync" as const;
/** Periodic fan-out over all eligible users. */
export const GMAIL_SYNC_TICK_JOB_NAME = "gmail-sync-tick" as const;
/** Per-user sync job. */
export const GMAIL_SYNC_USER_JOB_NAME = "gmail-sync-user" as const;
/** Default repeat interval for the tick job (ms). */
export const GMAIL_SYNC_TICK_INTERVAL_MS = 15 * 60 * 1000;

export const GmailSyncUserJobPayloadSchema = z.object({
  userId: z.string().min(1),
  /** manual | scheduled */
  reason: z.enum(["manual", "scheduled"]).default("scheduled")
});
export type GmailSyncUserJobPayload = z.infer<typeof GmailSyncUserJobPayloadSchema>;

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
  lastError: z.string().nullable(),
  /** When true, the server periodic job may sync this mailbox. */
  autoSyncEnabled: z.boolean()
});
export type GmailSyncStatus = z.infer<typeof GmailSyncStatusSchema>;

export const UpdateGmailAutoSyncInputSchema = z.object({
  autoSyncEnabled: z.boolean()
});
export type UpdateGmailAutoSyncInput = z.infer<typeof UpdateGmailAutoSyncInputSchema>;

export const UpdateGmailAutoSyncOutputSchema = z.object({
  autoSyncEnabled: z.boolean()
});
export type UpdateGmailAutoSyncOutput = z.infer<typeof UpdateGmailAutoSyncOutputSchema>;

export const StartGmailWatchOutputSchema = z.object({
  ok: z.boolean(),
  historyId: z.string().nullable().optional(),
  expiration: z.string().nullable().optional(),
  message: z.string().optional()
});
export type StartGmailWatchOutput = z.infer<typeof StartGmailWatchOutputSchema>;
