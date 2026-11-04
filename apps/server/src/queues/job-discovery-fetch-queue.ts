import { Queue, Worker, type ConnectionOptions, type Job } from "bullmq";

import { requestJobDiscoveryLand } from "@tsu-stack/api/lib/job-discovery/enqueue";
import {
  hashToDelay,
  listEnrolledUserIds,
  utcDay
} from "@tsu-stack/api/lib/job-discovery/enrollment";
import { JOB_DISCOVERY_FETCH_JOB_NAME, JOB_DISCOVERY_FETCH_QUEUE_NAME } from "@tsu-stack/core";
import { createDb, runWithDb } from "@tsu-stack/db";
import { createLogger } from "@tsu-stack/logger/server";

/**
 * Per-user discovery fetch tick (24h): one repeatable cron that fans out one
 * staggered land job per enrolled user. The land run performs the freehire
 * fetch itself — no freehire HTTP happens in the tick.
 */

const STORE_KEY = "__tsu_stack_job_discovery_fetch_server_store__";
const FETCH_TICK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const FETCH_DAILY_JOB_ID = "job-discovery-fetch-tick";

type TickPayload = Record<string, never>;

type QueueStore = {
  queue: Queue<TickPayload> | null;
  worker: Worker<TickPayload> | null;
};

function store(): QueueStore {
  const g = globalThis as typeof globalThis & Record<string, QueueStore | undefined>;
  g[STORE_KEY] ??= { queue: null, worker: null };
  return g[STORE_KEY]!;
}

function bullConnection(redisUrl: string): ConnectionOptions {
  return { url: redisUrl, maxRetriesPerRequest: null };
}

export function startJobDiscoveryFetchQueue(redisUrl: string): void {
  const s = store();
  if (s.queue) return;

  const connection = bullConnection(redisUrl);
  s.queue = new Queue<TickPayload>(JOB_DISCOVERY_FETCH_QUEUE_NAME, { connection });

  s.worker = new Worker<TickPayload>(
    JOB_DISCOVERY_FETCH_QUEUE_NAME,
    async (job: Job<TickPayload>) => {
      if (job.name !== JOB_DISCOVERY_FETCH_JOB_NAME) return;
      const log = createLogger({ operation: "server__job_discovery_fetch_tick" });
      const db = createDb();
      const result = await runWithDb(db, () => runFetchTick());
      log.set({
        event: "job_discovery_fetch_tick_done",
        jobId: job.id ?? null,
        ...result
      });
      log.emit();
    },
    { connection, concurrency: 1 }
  );

  s.worker.on("failed", (job, err) => {
    const log = createLogger({ operation: "server__job_discovery_fetch_tick" });
    log.error(err instanceof Error ? err : new Error(String(err)), {
      event: "job_discovery_fetch_tick_job_failed",
      jobId: job?.id ?? null
    });
    log.emit({ _forceKeep: true });
  });

  void s.queue.add(
    JOB_DISCOVERY_FETCH_JOB_NAME,
    {},
    {
      jobId: FETCH_DAILY_JOB_ID,
      repeat: { every: FETCH_TICK_INTERVAL_MS },
      // One retry: a failed tick reruns the whole fan-out; already-enqueued
      // users coalesce on the same-day `land_${userId}_cron_${utcDay}` job id.
      attempts: 2,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 50,
      removeOnFail: 100
    }
  );

  const boot = createLogger({ operation: "server__job_discovery_fetch_queue" });
  boot.set({
    event: "job_discovery_fetch_queue_started",
    queue: JOB_DISCOVERY_FETCH_QUEUE_NAME,
    intervalMs: FETCH_TICK_INTERVAL_MS
  });
  boot.emit();
}

async function runFetchTick(): Promise<Record<string, unknown>> {
  const now = new Date();
  const userIds = await listEnrolledUserIds(now);
  const runId = `cron_${utcDay(now)}`;

  let landEnqueued = 0;
  let failed = 0;
  for (const userId of userIds) {
    try {
      const { enqueued } = await requestJobDiscoveryLand(
        { userId, runId, trigger: "cron" },
        { delayMs: hashToDelay(userId) }
      );
      if (enqueued) {
        landEnqueued += 1;
      } else {
        failed += 1;
      }
    } catch (error) {
      failed += 1;
      const log = createLogger({ operation: "server__job_discovery_fetch_tick" });
      log.error(error instanceof Error ? error : new Error(String(error)), {
        event: "job_discovery_fetch_tick_enqueue_failed",
        userId,
        runId
      });
      log.emit({ _forceKeep: true });
    }
  }

  return { enrolled: userIds.length, landEnqueued, failed, runId };
}

export async function stopJobDiscoveryFetchQueue(): Promise<void> {
  const s = store();
  await s.worker?.close();
  await s.queue?.close();
  s.worker = null;
  s.queue = null;
}
