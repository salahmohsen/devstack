import { z } from "zod";

/** BullMQ queue name for Career Inbox classify jobs (apps/server worker). */
export const MAIL_CLASSIFY_QUEUE_NAME = "mail-classify" as const;

/** Job name within the queue. */
export const MAIL_CLASSIFY_JOB_NAME = "classify-message" as const;

/**
 * Payload for a classify job. Full Mastra workflow is a later epic —
 * producer + worker stub only need these fields.
 */
export const MailClassifyJobPayloadSchema = z.object({
  messageId: z.string().min(1),
  userId: z.string().min(1),
  /** When the message was accepted (ingress or re-queue). */
  enqueuedAt: z.string().datetime().optional(),
  /** When true, re-run AI even if already classified (hub reprocess). */
  forceReprocess: z.boolean().optional()
});
export type MailClassifyJobPayload = z.infer<typeof MailClassifyJobPayloadSchema>;
