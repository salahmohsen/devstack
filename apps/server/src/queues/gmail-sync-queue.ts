import { Queue, Worker, type ConnectionOptions, type Job } from "bullmq";

import { syncGmailInbox } from "@tsu-stack/api/lib/gmail/sync-gmail-inbox";
import {
  GMAIL_SYNC_QUEUE_NAME,
  GMAIL_SYNC_TICK_INTERVAL_MS,
  GMAIL_SYNC_TICK_JOB_NAME,
  GMAIL_SYNC_USER_JOB_NAME,
  GmailSyncUserJobPayloadSchema,
  type GmailSyncUserJobPayload
} from "@tsu-stack/core";
import { createDb, runWithDb, userGmailSyncRepository } from "@tsu-stack/db";
import { createLogger } from "@tsu-stack/logger/server";

/**
 * Background Gmail → Career Inbox sync.
 *
 * - Tick job (repeat every 15m): fan-out per eligible user
 * - User job: runs {@link syncGmailInbox} (History deltas + classify enqueue)
 */

type TickPayload = Record<string, never>;

let queue: Queue<GmailSyncUserJobPayload | TickPayload> | null = null;
let worker: Worker<GmailSyncUserJobPayload | TickPayload> | null = null;

function bullConnection(redisUrl: string): ConnectionOptions {
  return { url: redisUrl, maxRetriesPerRequest: null };
}

export function startGmailSyncQueue(redisUrl: string): void {
  if (queue) return;

  const connection = bullConnection(redisUrl);
  queue = new Queue(GMAIL_SYNC_QUEUE_NAME, { connection });

  worker = new Worker(
    GMAIL_SYNC_QUEUE_NAME,
    async (job: Job<GmailSyncUserJobPayload | TickPayload>) => {
      if (job.name === GMAIL_SYNC_TICK_JOB_NAME) {
        await runTick();
        return;
      }
      if (job.name === GMAIL_SYNC_USER_JOB_NAME) {
        await runUserSync(job.data as GmailSyncUserJobPayload);
        return;
      }
    },
    {
      connection,
      concurrency: 2
    }
  );

  worker.on("failed", (job, err) => {
    const log = createLogger({ operation: "server__gmail_sync_job" });
    log.error(err instanceof Error ? err : new Error(String(err)), {
      event: "gmail_sync_job_failed",
      jobId: job?.id ?? null,
      name: job?.name ?? null
    });
    log.emit({ _forceKeep: true });
  });

  void ensureTickSchedule();

  const boot = createLogger({ operation: "server__gmail_sync_queue" });
  boot.set({
    event: "gmail_sync_queue_started",
    queue: GMAIL_SYNC_QUEUE_NAME,
    intervalMs: GMAIL_SYNC_TICK_INTERVAL_MS
  });
  boot.emit();
}

async function ensureTickSchedule(): Promise<void> {
  if (!queue) return;
  // Idempotent repeatable job — same jobId avoids duplicates across restarts.
  await queue.add(
    GMAIL_SYNC_TICK_JOB_NAME,
    {},
    {
      jobId: "gmail-sync-tick",
      repeat: {
        every: GMAIL_SYNC_TICK_INTERVAL_MS
      },
      removeOnComplete: 50,
      removeOnFail: 100
    }
  );
}

async function runTick(): Promise<void> {
  if (!queue) return;
  const log = createLogger({ operation: "server__gmail_sync_tick" });
  const db = createDb();
  const userIds = await runWithDb(db, () => userGmailSyncRepository.listUserIdsForScheduledSync());

  let enqueued = 0;
  // Bucket id dedupes concurrent ticks for the same user while still allowing the next
  // interval after completion (fixed `gmail-sync-user:${id}` blocked re-enqueue while completed).
  const bucket = Math.floor(Date.now() / GMAIL_SYNC_TICK_INTERVAL_MS);
  for (const userId of userIds) {
    await queue.add(
      GMAIL_SYNC_USER_JOB_NAME,
      { userId, reason: "scheduled" satisfies GmailSyncUserJobPayload["reason"] },
      {
        jobId: `gmail-sync-user:${userId}:${bucket}`,
        removeOnComplete: true,
        removeOnFail: 100,
        attempts: 2,
        backoff: { type: "exponential", delay: 5000 }
      }
    );
    enqueued += 1;
  }

  log.set({
    event: "gmail_sync_tick_done",
    eligibleUsers: userIds.length,
    enqueued
  });
  log.emit();
}

async function runUserSync(raw: GmailSyncUserJobPayload): Promise<void> {
  const log = createLogger({ operation: "server__gmail_sync_user" });
  const parsed = GmailSyncUserJobPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    log.set({
      event: "gmail_sync_user_invalid",
      issues: parsed.error.issues.map((i) => i.message)
    });
    log.emit();
    return;
  }

  const db = createDb();
  const result = await runWithDb(db, () => syncGmailInbox(parsed.data.userId));

  if (!result.ok) {
    log.set({
      event: "gmail_sync_user_failed",
      userId: parsed.data.userId,
      reason: parsed.data.reason,
      code: result.code,
      message: result.message
    });
    log.emit();
    return;
  }

  log.set({
    event: "gmail_sync_user_ok",
    userId: parsed.data.userId,
    reason: parsed.data.reason,
    imported: result.result.imported,
    skipped: result.result.skipped
  });
  log.emit();
}

export async function stopGmailSyncQueue(): Promise<void> {
  await worker?.close();
  await queue?.close();
  worker = null;
  queue = null;
}
