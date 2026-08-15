import { z } from "zod";

export const JOB_CATALOG_INGEST_QUEUE_NAME = "job-catalog-ingest";
export const JOB_DISCOVERY_LAND_QUEUE_NAME = "job-discovery-land";
export const JOB_INBOX_AI_QUEUE_NAME = "job-inbox-ai";
export const JOB_INBOX_LIVENESS_QUEUE_NAME = "job-inbox-liveness";

export const JOB_CATALOG_INGEST_JOB_NAME = "catalog-ingest";
export const JOB_DISCOVERY_LAND_JOB_NAME = "discovery-land";
export const JOB_INBOX_AI_JOB_NAME = "inbox-ai";
export const JOB_INBOX_LIVENESS_JOB_NAME = "inbox-liveness";

export const JobDiscoveryLandPayloadSchema = z.object({
  userId: z.string().min(1),
  runId: z.string().min(1),
  trigger: z.enum(["cron", "find_now", "backfill"]),
  enqueuedAt: z.string().datetime().optional()
});
export const JobInboxAiPayloadSchema = z.object({
  userId: z.string().min(1),
  applicationId: z.string().min(1),
  runId: z.string().min(1)
});
export const JobCatalogIngestPayloadSchema = z.object({
  mode: z.enum(["daily", "user_query"]),
  userId: z.string().optional(),
  runId: z.string().optional()
});

export type JobDiscoveryLandPayload = z.infer<typeof JobDiscoveryLandPayloadSchema>;
export type JobInboxAiPayload = z.infer<typeof JobInboxAiPayloadSchema>;
export type JobCatalogIngestPayload = z.infer<typeof JobCatalogIngestPayloadSchema>;
