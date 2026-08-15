import { Queue, Worker, type ConnectionOptions, type Job } from "bullmq";

import { runDiscoveryLand } from "@tsu-stack/api/lib/job-discovery/land";
import {
  JOB_DISCOVERY_LAND_JOB_NAME,
  JOB_DISCOVERY_LAND_QUEUE_NAME,
  JobDiscoveryLandPayloadSchema,
  landJobId,
  type JobDiscoveryLandPayload
} from "@tsu-stack/core";
import { createDb, runWithDb } from "@tsu-stack/db";
import { createLogger } from "@tsu-stack/logger/server";

/**
 * Per-user discovery land.
 *
 * jobId `land_${userId}_${runId}` coalesces cron / findNow / backfill while
 * waiting or active. removeOnComplete/Fail so the same runId can be re-enqueued
 * after AI dismiss (do not keep harvest-style completed ids).
 */

const STORE_KEY = "__tsu_stack_job_discovery_land_server_store__";

type QueueStore = {
  queue: Queue<JobDiscoveryLandPayload> | null;
  worker: Worker<JobDiscoveryLandPayload> | null;
};

function store(): QueueStore {
  const g = globalThis as typeof globalThis & Record<string, QueueStore | undefined>;
  g[STORE_KEY] ??= { queue: null, worker: null };
  return g[STORE_KEY]!;
}

function bullConnection(redisUrl: string): ConnectionOptions {
  return { url: redisUrl, maxRetriesPerRequest: null };
}

export function startJobDiscoveryLandQueue(redisUrl: string): void {
  const s = store();
  if (s.queue) return;

  const connection = bullConnection(redisUrl);
  s.queue = new Queue<JobDiscoveryLandPayload>(JOB_DISCOVERY_LAND_QUEUE_NAME, { connection });

  s.worker = new Worker<JobDiscoveryLandPayload>(
    JOB_DISCOVERY_LAND_QUEUE_NAME,
    async (job: Job<JobDiscoveryLandPayload>) => {
      const log = createLogger({ operation: "server__job_discovery_land_job" });
      const parsed = JobDiscoveryLandPayloadSchema.safeParse(job.data);
      if (!parsed.success) {
        log.set({
          event: "job_discovery_land_job_invalid",
          jobId: job.id ?? null,
          issues: parsed.error.issues.map((issue) => issue.message)
        });
        log.emit({ _forceKeep: true });
        throw new Error(
          `Invalid job-discovery-land payload: ${parsed.error.issues.map((i) => i.message).join("; ")}`
        );
      }

      const db = createDb();
      const result = await runWithDb(db, () =>
        runDiscoveryLand({
          userId: parsed.data.userId,
          runId: parsed.data.runId
        })
      );

      log.set({
        event: "job_discovery_land_ok",
        jobId: job.id ?? null,
        userId: parsed.data.userId,
        runId: parsed.data.runId,
        trigger: parsed.data.trigger,
        landed: result.landed,
        reason: result.reason
      });
      log.emit();
    },
    { connection }
  );

  s.worker.on("failed", (job, err) => {
    const log = createLogger({ operation: "server__job_discovery_land_job" });
    log.error(err instanceof Error ? err : new Error(String(err)), {
      event: "job_discovery_land_job_failed",
      jobId: job?.id ?? null
    });
    log.emit({ _forceKeep: true });
  });

  const boot = createLogger({ operation: "server__job_discovery_land_queue" });
  boot.set({ event: "job_discovery_land_queue_started", queue: JOB_DISCOVERY_LAND_QUEUE_NAME });
  boot.emit();
}

/** Drop a leftover completed/failed id so backfill can reuse `land_${userId}_${runId}`. */
async function removeFinishedLandJob(
  queue: Queue<JobDiscoveryLandPayload>,
  jobId: string
): Promise<void> {
  const existing = await queue.getJob(jobId);
  if (!existing) return;
  const state = await existing.getState();
  if (state === "completed" || state === "failed") {
    await existing.remove();
  }
}

export async function enqueueJobDiscoveryLand(
  payload: JobDiscoveryLandPayload
): Promise<{ enqueued: boolean; jobId?: string }> {
  const s = store();
  if (!s.queue) {
    return { enqueued: false };
  }

  const data: JobDiscoveryLandPayload = {
    ...payload,
    enqueuedAt: payload.enqueuedAt ?? new Date().toISOString()
  };
  const jobId = landJobId(data.userId, data.runId);

  try {
    await removeFinishedLandJob(s.queue, jobId);
    const job = await s.queue.add(JOB_DISCOVERY_LAND_JOB_NAME, data, {
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
      return { enqueued: false };
    }
    const log = createLogger({ operation: "server__job_discovery_land_queue" });
    log.error(error instanceof Error ? error : new Error(message), {
      event: "job_discovery_land_enqueue_failed",
      jobId
    });
    log.emit({ _forceKeep: true });
    return { enqueued: false };
  }
}

export async function stopJobDiscoveryLandQueue(): Promise<void> {
  const s = store();
  await s.worker?.close();
  await s.queue?.close();
  s.worker = null;
  s.queue = null;
}
