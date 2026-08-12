import { Queue, Worker, type ConnectionOptions, type Job } from "bullmq";

import { purgeDismissedApplications } from "@tsu-stack/api/lib/application/purge-dismissed-applications";
import {
  DISMISSED_APPLICATION_PURGE_QUEUE_NAME,
  DISMISSED_APPLICATION_PURGE_TICK_INTERVAL_MS,
  DISMISSED_APPLICATION_PURGE_TICK_JOB_NAME
} from "@tsu-stack/core";
import { createDb, runWithDb } from "@tsu-stack/db";
import { createLogger } from "@tsu-stack/logger/server";

import { getRuntime } from "#@/runtime-context";

let queue: Queue | null = null;
let worker: Worker | null = null;

function bullConnection(redisUrl: string): ConnectionOptions {
  return { url: redisUrl, maxRetriesPerRequest: null };
}

export function startDismissedApplicationPurgeQueue(redisUrl: string): void {
  if (queue) return;

  const connection = bullConnection(redisUrl);
  queue = new Queue(DISMISSED_APPLICATION_PURGE_QUEUE_NAME, { connection });

  worker = new Worker(
    DISMISSED_APPLICATION_PURGE_QUEUE_NAME,
    async (job: Job) => {
      if (job.name !== DISMISSED_APPLICATION_PURGE_TICK_JOB_NAME) return;
      const log = createLogger({ operation: "server__dismissed_application_purge_tick" });
      const db = createDb();
      const runtime = getRuntime();

      const result = await runWithDb(db, () =>
        purgeDismissedApplications({
          deleteObject: (key) => runtime.files.delete(key)
        })
      );

      log.set({
        event: "dismissed_application_purge_tick_done",
        deleted: result.deleted,
        coverCleanupFailed: result.coverCleanupFailed,
        afterDays: result.afterDays,
        cutoff: result.cutoff.toISOString()
      });
      log.emit();
    },
    { connection, concurrency: 1 }
  );

  worker.on("failed", (job, err) => {
    const log = createLogger({ operation: "server__dismissed_application_purge_job" });
    log.error(err instanceof Error ? err : new Error(String(err)), {
      event: "dismissed_application_purge_job_failed",
      jobId: job?.id ?? null
    });
    log.emit({ _forceKeep: true });
  });

  void queue.add(
    DISMISSED_APPLICATION_PURGE_TICK_JOB_NAME,
    {},
    {
      jobId: "dismissed-application-purge-tick",
      repeat: { every: DISMISSED_APPLICATION_PURGE_TICK_INTERVAL_MS },
      removeOnComplete: 50,
      removeOnFail: 100
    }
  );

  const boot = createLogger({ operation: "server__dismissed_application_purge_queue" });
  boot.set({
    event: "dismissed_application_purge_queue_started",
    intervalMs: DISMISSED_APPLICATION_PURGE_TICK_INTERVAL_MS
  });
  boot.emit();
}

export async function stopDismissedApplicationPurgeQueue(): Promise<void> {
  await worker?.close();
  await queue?.close();
  worker = null;
  queue = null;
}
