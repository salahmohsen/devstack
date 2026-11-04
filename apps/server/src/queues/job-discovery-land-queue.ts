import { UnrecoverableError, Queue, Worker, type ConnectionOptions, type Job } from "bullmq";

import { FreehireError } from "@tsu-stack/api/lib/job-discovery/freehire/errors";
import { runDiscoveryLand } from "@tsu-stack/api/lib/job-discovery/land";
import {
  JOB_DISCOVERY_LAND_JOB_NAME,
  JOB_DISCOVERY_LAND_QUEUE_NAME,
  JobDiscoveryLandPayloadSchema,
  landJobId,
  discoveryBlockedReason,
  type JobDiscoveryLandPayload
} from "@tsu-stack/core";
import { jobDiscoveryRunRepository, createDb, runWithDb } from "@tsu-stack/db";
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
      const result = await runWithDb(db, async () => {
        const { userId, runId } = parsed.data;
        try {
          if (!(await jobDiscoveryRunRepository.find(userId, runId))) {
            await jobDiscoveryRunRepository.claim(userId, runId, new Date());
          }
          const result = await runDiscoveryLand({ userId, runId });
          await jobDiscoveryRunRepository.update(userId, runId, {
            stage: discoveryBlockedReason(result.reason) ? "failed" : "scoring",
            landFinished: true,
            reason:
              result.reason === "ok"
                ? null
                : result.reason === "empty_shelf"
                  ? "No unseen listings passed your saved preferences."
                  : result.reason
          });
          await jobDiscoveryRunRepository.settle(userId, runId);
          return result;
        } catch (error) {
          const permanent = error instanceof FreehireError && !error.retryable;
          const terminal = permanent || job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
          const delay = discoveryRetryDelay(job.attemptsMade + 1, error);
          await jobDiscoveryRunRepository.update(userId, runId, {
            stage: terminal ? "failed" : "retrying",
            reason:
              error instanceof FreehireError
                ? error.message
                : "Search could not finish. Try again shortly.",
            retryAt: terminal ? null : new Date(Date.now() + delay)
          });
          if (permanent) throw new UnrecoverableError((error as Error).message);
          throw error;
        }
      });

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
    {
      connection,
      settings: {
        backoffStrategy: (attemptsMade, _type, error) => discoveryRetryDelay(attemptsMade, error)
      }
    }
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
async function coalesceOrRemoveFinishedLandJob(
  queue: Queue<JobDiscoveryLandPayload>,
  jobId: string
): Promise<"coalesced" | "free"> {
  const existing = await queue.getJob(jobId);
  if (!existing) return "free";
  const state = await existing.getState();
  if (state === "completed" || state === "failed") {
    await existing.remove();
    return "free";
  }
  return "coalesced";
}

export async function enqueueJobDiscoveryLand(
  payload: JobDiscoveryLandPayload,
  opts?: { delayMs?: number }
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
    const gate = await coalesceOrRemoveFinishedLandJob(s.queue, jobId);
    if (gate === "coalesced") {
      return { enqueued: true, jobId };
    }
    const job = await s.queue.add(JOB_DISCOVERY_LAND_JOB_NAME, data, {
      jobId,
      delay: opts?.delayMs,
      removeOnComplete: true,
      removeOnFail: true,
      attempts: 3,
      backoff: { type: "discovery", delay: 2000 }
    });
    return { enqueued: true, jobId: job.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/already exists|JobId/i.test(message)) {
      return { enqueued: true, jobId };
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

export function discoveryRetryDelay(attempt: number, error: unknown): number {
  const backoff = Math.min(30_000, 2_000 * 2 ** Math.max(0, attempt - 1));
  const retryAfter = error instanceof FreehireError ? error.retryAfterMs : 0;
  return Math.max(retryAfter, backoff);
}
