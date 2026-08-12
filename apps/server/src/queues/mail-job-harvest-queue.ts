import { Queue, Worker, type ConnectionOptions, type Job } from "bullmq";

import {
  MAIL_JOB_HARVEST_JOB_NAME,
  MAIL_JOB_HARVEST_QUEUE_NAME,
  MailJobHarvestJobPayloadSchema,
  type MailJobHarvestJobPayload
} from "@tsu-stack/core";
import { createLogger } from "@tsu-stack/logger/server";

import { runMailJobHarvest } from "#@/queues/run-mail-job-harvest";

/**
 * Career Inbox job-harvest queue.
 *
 * - Producer: {@link enqueueMailJobHarvest} after classify labels include `job_notifier`
 * - Worker: extract jobs from mail → score prefs → create Applications
 *
 * Run: started from `apps/server` when `REDIS_URL` is set (`src/index.ts`).
 * API Scan can also produce via packages/api direct Redis producer (separate Queue client).
 */

/** Survive Vite dual-module copies of this file (same process, one Redis worker). */
const STORE_KEY = "__tsu_stack_mail_job_harvest_server_store__";

type QueueStore = {
  queue: Queue<MailJobHarvestJobPayload> | null;
  worker: Worker<MailJobHarvestJobPayload> | null;
};

function store(): QueueStore {
  const g = globalThis as typeof globalThis & Record<string, QueueStore | undefined>;
  g[STORE_KEY] ??= { queue: null, worker: null };
  return g[STORE_KEY]!;
}

function bullConnection(redisUrl: string): ConnectionOptions {
  return { url: redisUrl, maxRetriesPerRequest: null };
}

export function startMailJobHarvestQueue(redisUrl: string): void {
  const s = store();
  if (s.queue) return;

  const connection = bullConnection(redisUrl);
  s.queue = new Queue<MailJobHarvestJobPayload>(MAIL_JOB_HARVEST_QUEUE_NAME, { connection });

  s.worker = new Worker<MailJobHarvestJobPayload>(
    MAIL_JOB_HARVEST_QUEUE_NAME,
    async (job: Job<MailJobHarvestJobPayload>) => {
      const log = createLogger({ operation: "server__mail_job_harvest_job" });
      const parsed = MailJobHarvestJobPayloadSchema.safeParse(job.data);
      if (!parsed.success) {
        log.set({
          event: "mail_job_harvest_job_invalid",
          jobId: job.id ?? null,
          issues: parsed.error.issues.map((issue) => issue.message)
        });
        log.emit();
        return;
      }

      const result = await runMailJobHarvest({
        messageId: parsed.data.messageId,
        userId: parsed.data.userId
      });

      log.set({
        event: "mail_job_harvest_job_ok",
        jobId: job.id ?? null,
        messageId: result.messageId,
        userId: result.userId,
        candidatesFound: result.candidatesFound,
        created: result.created,
        skippedLowMatch: result.skippedLowMatch,
        skippedDuplicate: result.skippedDuplicate,
        skippedFailed: result.skippedFailed
      });
      log.emit();
    },
    { connection }
  );

  s.worker.on("failed", (job, err) => {
    const log = createLogger({ operation: "server__mail_job_harvest_job" });
    log.error(err instanceof Error ? err : new Error(String(err)), {
      event: "mail_job_harvest_job_failed",
      jobId: job?.id ?? null
    });
    log.emit({ _forceKeep: true });
  });

  const boot = createLogger({ operation: "server__mail_job_harvest_queue" });
  boot.set({ event: "mail_job_harvest_queue_started", queue: MAIL_JOB_HARVEST_QUEUE_NAME });
  boot.emit();
}

/**
 * Enqueue job harvest after classify labels `job_notifier` (or manual scan).
 * No-op when queue was never started (no REDIS_URL).
 *
 * @param options.force - Manual re-scan: unique jobId so completed harvests can run again.
 *   Create path still dedupes via `createIfAbsentByUrl` (no duplicate applications).
 */
export async function enqueueMailJobHarvest(
  payload: MailJobHarvestJobPayload,
  options?: { force?: boolean }
): Promise<{ enqueued: boolean; jobId?: string }> {
  const s = store();
  if (!s.queue) {
    return { enqueued: false };
  }

  const data: MailJobHarvestJobPayload = {
    ...payload,
    enqueuedAt: payload.enqueuedAt ?? new Date().toISOString()
  };

  // BullMQ custom job ids cannot contain `:` (used as Redis key separators).
  const jobId = options?.force
    ? `harvest_${data.userId}_${data.messageId}_${Date.now()}`
    : `harvest_${data.userId}_${data.messageId}`;

  try {
    const job = await s.queue.add(MAIL_JOB_HARVEST_JOB_NAME, data, {
      jobId,
      removeOnComplete: 1000,
      removeOnFail: 5000,
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 }
    });
    return { enqueued: true, jobId: job.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!options?.force && /already exists|JobId/i.test(message)) {
      return { enqueued: false };
    }
    const log = createLogger({ operation: "server__mail_job_harvest_queue" });
    log.error(error instanceof Error ? error : new Error(message), {
      event: "mail_job_harvest_enqueue_failed",
      jobId,
      force: Boolean(options?.force)
    });
    log.emit({ _forceKeep: true });
    return { enqueued: false };
  }
}

export async function stopMailJobHarvestQueue(): Promise<void> {
  const s = store();
  await s.worker?.close();
  await s.queue?.close();
  s.worker = null;
  s.queue = null;
}
