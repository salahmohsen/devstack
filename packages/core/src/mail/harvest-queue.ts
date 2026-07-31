import { z } from "zod";

/** BullMQ queue name for job-link harvest after `job_notifier` classify (apps/server worker). */
export const MAIL_JOB_HARVEST_QUEUE_NAME = "mail-job-harvest" as const;

/** Job name within the queue. */
export const MAIL_JOB_HARVEST_JOB_NAME = "harvest-message" as const;

/**
 * Payload for a job-harvest job.
 * Worker: extract links from mail → optional page enrich → score prefs → create Applications.
 */
export const MailJobHarvestJobPayloadSchema = z.object({
  messageId: z.string().min(1),
  userId: z.string().min(1),
  /** When the message was accepted for harvest (post-classify). */
  enqueuedAt: z.string().datetime().optional()
});
export type MailJobHarvestJobPayload = z.infer<typeof MailJobHarvestJobPayloadSchema>;
