import { z } from "zod";

export const JOB_CATALOG_INGEST_QUEUE_NAME = "job-catalog-ingest";
export const JOB_DISCOVERY_FETCH_QUEUE_NAME = "job-discovery-fetch";
export const JOB_DISCOVERY_LAND_QUEUE_NAME = "job-discovery-land";
export const JOB_INBOX_AI_QUEUE_NAME = "job-inbox-ai";
export const JOB_INBOX_LIVENESS_QUEUE_NAME = "job-inbox-liveness";
export const JOB_INBOX_TICK_QUEUE_NAME = "job-inbox-tick";

export const JOB_CATALOG_INGEST_JOB_NAME = "catalog-ingest";
export const JOB_DISCOVERY_FETCH_JOB_NAME = "discovery-fetch";
export const JOB_DISCOVERY_LAND_JOB_NAME = "discovery-land";
export const JOB_INBOX_AI_JOB_NAME = "inbox-ai";
export const JOB_INBOX_LIVENESS_JOB_NAME = "inbox-liveness";
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
}): string {
  if (payload.applicationId) return inboxAiJobId(payload.applicationId);
  if (payload.jobId) return inboxEvaluateJobId(payload.userId, payload.jobId);
  throw new Error("inboxAiQueueJobId: jobId or applicationId is required");
}

/** BullMQ custom job ids reject `:`. Query keys are `pack:frontend` / `custom:k8s|sre`. */
export function sanitizeBullJobIdPart(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]+/g, "_");
}

/**
 * Coalesce ingest while waiting/active. Find-now uses
 * `ingest_${userId}_${queryKey}_${utcDay}` so same-day repeats share a job;
 * daily cron uses `ingest_daily_${utcDay}`.
 */
export function ingestJobId(input: {
  mode: "daily" | "user_query";
  userId?: string;
  runId?: string;
  queryKey?: string | null;
  now?: Date;
}): string {
  const utcDay = (input.now ?? new Date()).toISOString().slice(0, 10);
  if (input.mode === "user_query" && input.userId) {
    const queryKey = input.queryKey?.trim();
    if (queryKey) {
      return `ingest_${sanitizeBullJobIdPart(input.userId)}_${sanitizeBullJobIdPart(queryKey)}_${utcDay}`;
    }
    if (input.runId) {
      return `ingest_${sanitizeBullJobIdPart(input.userId)}_${sanitizeBullJobIdPart(input.runId)}`;
    }
  }
  return `ingest_daily_${utcDay}`;
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
export const JobCatalogIngestPayloadSchema = z.object({
  mode: z.enum(["daily", "user_query"]),
  userId: z.string().optional(),
  runId: z.string().optional(),
  /** Used only to mint `ingestJobId` for user_query coalesce. */
  queryKey: z.string().optional()
});

export type JobDiscoveryLandPayload = z.infer<typeof JobDiscoveryLandPayloadSchema>;
export type JobInboxAiPayload = z.infer<typeof JobInboxAiPayloadSchema>;
export type JobCatalogIngestPayload = z.infer<typeof JobCatalogIngestPayloadSchema>;
