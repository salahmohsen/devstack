import { Queue, Worker, type ConnectionOptions, type Job } from "bullmq";

import { loadJobPreference } from "@tsu-stack/api/lib/application/load-job-preference";
import {
  getRemotiveCallsLeft,
  ingestFeeds,
  ingestForUserQuery,
  ingestQuery,
  planIngestQueries
} from "@tsu-stack/api/lib/job-discovery/ingest";
import {
  hasValidDiscoveryTitle,
  ingestJobId,
  JOB_CATALOG_INGEST_JOB_NAME,
  JOB_CATALOG_INGEST_QUEUE_NAME,
  JobCatalogIngestPayloadSchema,
  JobTitleIdSchema,
  type JobCatalogIngestPayload
} from "@tsu-stack/core";
import {
  createDb,
  jobPreferenceRepository,
  runWithDb,
  type JobPreferenceEntity
} from "@tsu-stack/db";
import { createLogger } from "@tsu-stack/logger/server";

import { enqueueJobDiscoveryLand } from "#@/queues/job-discovery-land-queue";

/**
 * Shared catalog ingest: daily cron (all distinct queries + feeds + land each
 * titled user) and find-now `user_query` (one user's q, then land that user).
 */

const STORE_KEY = "__tsu_stack_job_catalog_ingest_server_store__";
const INGEST_TICK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const INGEST_DAILY_JOB_ID = "job-catalog-ingest-daily";

type QueueStore = {
  queue: Queue<JobCatalogIngestPayload> | null;
  worker: Worker<JobCatalogIngestPayload> | null;
};

function store(): QueueStore {
  const g = globalThis as typeof globalThis & Record<string, QueueStore | undefined>;
  g[STORE_KEY] ??= { queue: null, worker: null };
  return g[STORE_KEY]!;
}

function bullConnection(redisUrl: string): ConnectionOptions {
  return { url: redisUrl, maxRetriesPerRequest: null };
}

function utcDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function titleFields(row: Pick<JobPreferenceEntity, "titleId" | "customTitle" | "roleKeywords">) {
  const parsed = JobTitleIdSchema.safeParse(row.titleId);
  return {
    titleId: parsed.success ? parsed.data : null,
    customTitle: row.customTitle,
    roleKeywords: row.roleKeywords ?? []
  };
}

export function startJobCatalogIngestQueue(redisUrl: string): void {
  const s = store();
  if (s.queue) return;

  const connection = bullConnection(redisUrl);
  s.queue = new Queue<JobCatalogIngestPayload>(JOB_CATALOG_INGEST_QUEUE_NAME, { connection });

  s.worker = new Worker<JobCatalogIngestPayload>(
    JOB_CATALOG_INGEST_QUEUE_NAME,
    async (job: Job<JobCatalogIngestPayload>) => {
      const log = createLogger({ operation: "server__job_catalog_ingest_job" });
      const parsed = JobCatalogIngestPayloadSchema.safeParse(job.data);
      if (!parsed.success) {
        log.set({
          event: "job_catalog_ingest_job_invalid",
          jobId: job.id ?? null,
          issues: parsed.error.issues.map((issue) => issue.message)
        });
        log.emit({ _forceKeep: true });
        throw new Error(
          `Invalid job-catalog-ingest payload: ${parsed.error.issues.map((i) => i.message).join("; ")}`
        );
      }

      const db = createDb();
      const counts = await runWithDb(db, () => runIngest(parsed.data));

      log.set({
        event: "job_catalog_ingest_ok",
        jobId: job.id ?? null,
        ...counts
      });
      log.emit();
    },
    { connection, concurrency: 1 }
  );

  s.worker.on("failed", (job, err) => {
    const log = createLogger({ operation: "server__job_catalog_ingest_job" });
    log.error(err instanceof Error ? err : new Error(String(err)), {
      event: "job_catalog_ingest_job_failed",
      jobId: job?.id ?? null
    });
    log.emit({ _forceKeep: true });
  });

  void s.queue.add(
    JOB_CATALOG_INGEST_JOB_NAME,
    { mode: "daily" },
    {
      jobId: INGEST_DAILY_JOB_ID,
      repeat: { every: INGEST_TICK_INTERVAL_MS },
      removeOnComplete: 50,
      removeOnFail: 100
    }
  );

  const boot = createLogger({ operation: "server__job_catalog_ingest_queue" });
  boot.set({
    event: "job_catalog_ingest_queue_started",
    queue: JOB_CATALOG_INGEST_QUEUE_NAME,
    intervalMs: INGEST_TICK_INTERVAL_MS
  });
  boot.emit();
}

async function runIngest(data: JobCatalogIngestPayload): Promise<Record<string, unknown>> {
  if (data.mode === "user_query") {
    return runUserQueryIngest(data);
  }
  return runDailyIngest();
}

async function runDailyIngest(): Promise<Record<string, unknown>> {
  const prefs = await jobPreferenceRepository.listUsersWithValidTitle();
  const keys = planIngestQueries(prefs.map(titleFields));

  let queryUpserted = 0;
  let remotiveUsed = 0;
  for (const queryKey of keys) {
    // Re-read remaining each query — do not snapshot the day's budget once.
    const remotiveCallsLeft = await getRemotiveCallsLeft();
    const result = await ingestQuery({ queryKey, remotiveCallsLeft });
    queryUpserted += result.upserted;
    remotiveUsed += result.remotiveUsed;
  }

  const feeds = await ingestFeeds();
  const runId = `cron_${utcDay()}`;

  let landEnqueued = 0;
  let titledUsers = 0;
  for (const pref of prefs) {
    const title = titleFields(pref);
    if (!hasValidDiscoveryTitle(title)) continue;
    titledUsers += 1;
    const result = await enqueueJobDiscoveryLand({
      userId: pref.userId,
      runId,
      trigger: "cron"
    });
    if (result.enqueued) landEnqueued += 1;
  }

  return {
    mode: "daily",
    runId,
    prefs: prefs.length,
    titledUsers,
    queries: keys.length,
    queryUpserted,
    feedUpserted: feeds.upserted,
    remotiveUsed,
    landEnqueued
  };
}

async function runUserQueryIngest(data: JobCatalogIngestPayload): Promise<Record<string, unknown>> {
  const userId = data.userId?.trim() ?? "";
  const runId = data.runId?.trim() ?? "";
  if (!userId || !runId) {
    throw new Error("job-catalog-ingest user_query requires userId and runId");
  }

  const prefs = await loadJobPreference(userId);
  const ingested = await ingestForUserQuery(prefs);
  const land = await enqueueJobDiscoveryLand({
    userId,
    runId,
    trigger: "find_now"
  });

  return {
    mode: "user_query",
    userId,
    runId,
    upserted: ingested.upserted,
    landEnqueued: land.enqueued
  };
}

export async function enqueueJobCatalogIngest(
  payload: JobCatalogIngestPayload
): Promise<{ enqueued: boolean; jobId?: string }> {
  const s = store();
  if (!s.queue) {
    return { enqueued: false };
  }

  const data = JobCatalogIngestPayloadSchema.parse(payload);
  const jobId = ingestJobId(data);

  try {
    const existing = await s.queue.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      if (state === "completed" || state === "failed") {
        await existing.remove();
      } else {
        return { enqueued: true, jobId };
      }
    }
    const job = await s.queue.add(JOB_CATALOG_INGEST_JOB_NAME, data, {
      jobId,
      removeOnComplete: true,
      removeOnFail: true,
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 }
    });
    return { enqueued: true, jobId: job.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/already exists|JobId/i.test(message)) {
      return { enqueued: true, jobId };
    }
    const log = createLogger({ operation: "server__job_catalog_ingest_queue" });
    log.error(error instanceof Error ? error : new Error(message), {
      event: "job_catalog_ingest_enqueue_failed",
      jobId
    });
    log.emit({ _forceKeep: true });
    return { enqueued: false };
  }
}

export async function stopJobCatalogIngestQueue(): Promise<void> {
  const s = store();
  await s.worker?.close();
  await s.queue?.close();
  s.worker = null;
  s.queue = null;
}
