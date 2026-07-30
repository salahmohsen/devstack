import { Queue, Worker, type ConnectionOptions, type Job } from "bullmq";

import { sendNotificationDigestForUser } from "@tsu-stack/api/lib/notification/send-notification-digest";
import {
  NOTIFICATION_DIGEST_QUEUE_NAME,
  NOTIFICATION_DIGEST_TICK_INTERVAL_MS,
  NOTIFICATION_DIGEST_TICK_JOB_NAME
} from "@tsu-stack/core";
import { appNotificationRepository, createDb, runWithDb } from "@tsu-stack/db";
import { createLogger } from "@tsu-stack/logger/server";

let queue: Queue | null = null;
let worker: Worker | null = null;

function bullConnection(redisUrl: string): ConnectionOptions {
  return { url: redisUrl, maxRetriesPerRequest: null };
}

export function startNotificationDigestQueue(redisUrl: string): void {
  if (queue) return;

  const connection = bullConnection(redisUrl);
  queue = new Queue(NOTIFICATION_DIGEST_QUEUE_NAME, { connection });

  worker = new Worker(
    NOTIFICATION_DIGEST_QUEUE_NAME,
    async (job: Job) => {
      if (job.name !== NOTIFICATION_DIGEST_TICK_JOB_NAME) return;
      const log = createLogger({ operation: "server__notification_digest_tick" });
      const db = createDb();
      const userIds = await runWithDb(db, () =>
        appNotificationRepository.listUserIdsWithPendingDigest()
      );

      let sent = 0;
      let total = 0;
      for (const userId of userIds) {
        const result = await runWithDb(db, () => sendNotificationDigestForUser(userId));
        if (result.sent) {
          sent += 1;
          total += result.count;
        }
      }

      log.set({
        event: "notification_digest_tick_done",
        users: userIds.length,
        digestsSent: sent,
        items: total
      });
      log.emit();
    },
    { connection, concurrency: 1 }
  );

  worker.on("failed", (job, err) => {
    const log = createLogger({ operation: "server__notification_digest_job" });
    log.error(err instanceof Error ? err : new Error(String(err)), {
      event: "notification_digest_job_failed",
      jobId: job?.id ?? null
    });
    log.emit({ _forceKeep: true });
  });

  void queue.add(
    NOTIFICATION_DIGEST_TICK_JOB_NAME,
    {},
    {
      jobId: "notification-digest-tick",
      repeat: { every: NOTIFICATION_DIGEST_TICK_INTERVAL_MS },
      removeOnComplete: 50,
      removeOnFail: 100
    }
  );

  const boot = createLogger({ operation: "server__notification_digest_queue" });
  boot.set({
    event: "notification_digest_queue_started",
    intervalMs: NOTIFICATION_DIGEST_TICK_INTERVAL_MS
  });
  boot.emit();
}

export async function stopNotificationDigestQueue(): Promise<void> {
  await worker?.close();
  await queue?.close();
  worker = null;
  queue = null;
}
