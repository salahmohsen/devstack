import { z } from "zod";

export const JOB_DISCOVERY_FETCH_QUEUE_NAME = "job-discovery-fetch";
export const JOB_DISCOVERY_LAND_QUEUE_NAME = "job-discovery-land";
export const JOB_INBOX_AI_QUEUE_NAME = "job-inbox-ai";
export const JOB_INBOX_TICK_QUEUE_NAME = "job-inbox-tick";

export const JOB_DISCOVERY_FETCH_JOB_NAME = "discovery-fetch";
export const JOB_DISCOVERY_LAND_JOB_NAME = "discovery-land";
export const JOB_INBOX_AI_JOB_NAME = "inbox-ai";
export const JOB_INBOX_TICK_JOB_NAME = "inbox-tick";

/** Coalesce cron / findNow / backfill while waiting or active. */
export function landJobId(userId: string, runId: string): string {
  return `land_${userId}_${runId}`;
}

/** One AI pass per application while waiting or active (harvest / manual). */
export function inboxAiJobId(applicationId: string): string {
  return `inboxai_${applicationId}`;
}

/** One evaluate pass per user+job while waiting or active. */
export function inboxEvaluateJobId(userId: string, jobId: string): string {
  return `eval_${sanitizeBullJobIdPart(userId)}_${sanitizeBullJobIdPart(jobId)}`;
}

/** Discovery evaluate uses jobId (user_job); harvest/manual keep applicationId. */
export function inboxAiQueueJobId(payload: {
  userId: string;
  jobId?: string;
  applicationId?: string;
  runId?: string;
}): string {
  if (payload.applicationId) return inboxAiJobId(payload.applicationId);
  if (payload.jobId) {
    return `${inboxEvaluateJobId(payload.userId, payload.jobId)}${payload.runId ? `_${sanitizeBullJobIdPart(payload.runId)}` : ""}`;
  }
  throw new Error("inboxAiQueueJobId: jobId or applicationId is required");
}

/** BullMQ custom job ids reject `:`. Query keys are `pack:frontend` / `custom:k8s|sre`. */
export function sanitizeBullJobIdPart(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]+/g, "_");
}

export const JobDiscoveryLandPayloadSchema = z.object({
  userId: z.string().min(1),
  runId: z.string().min(1),
  trigger: z.enum(["cron", "find_now", "backfill"]),
  enqueuedAt: z.string().datetime().optional()
});
export const JobInboxAiPayloadSchema = z
  .object({
    userId: z.string().min(1),
    runId: z.string().min(1),
    jobId: z.string().min(1).optional(),
    applicationId: z.string().min(1).optional()
  })
  .refine((data) => Boolean(data.jobId ?? data.applicationId), {
    message: "jobId or applicationId is required"
  });

export type JobDiscoveryLandPayload = z.infer<typeof JobDiscoveryLandPayloadSchema>;
export type JobInboxAiPayload = z.infer<typeof JobInboxAiPayloadSchema>;
