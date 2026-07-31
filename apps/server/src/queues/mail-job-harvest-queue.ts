import { Queue, Worker, type ConnectionOptions, type Job } from "bullmq";

import {
  MAIL_JOB_HARVEST_JOB_NAME,
  MAIL_JOB_HARVEST_QUEUE_NAME,
  MailJobHarvestJobPayloadSchema,
  type MailJobHarvestJobPayload
} from "@tsu-stack/core";
import { createLogger } from "@tsu-stack/logger/server";

/**
 * Career Inbox job-harvest queue (P0 stub).
 *
 * - Producer: {@link enqueueMailJobHarvest} after classify labels include `job_notifier`
 * - Worker: logs only — P1 implements crawl / score / Applications create
 *
 * Run: started from `apps/server` when `REDIS_URL` is set (`src/index.ts`).
 */

let queue: Queue<MailJobHarvestJobPayload> | null = null;
let worker: Worker<MailJobHarvestJobPayload> | null = null;

function bullConnection(redisUrl: string): ConnectionOptions {
  return { url: redisUrl, maxRetriesPerRequest: null };
}

export function startMailJobHarvestQueue(redisUrl: string): void {
  if (queue) return;

  const connection = bullConnection(redisUrl);
  queue = new Queue<MailJobHarvestJobPayload>(MAIL_JOB_HARVEST_QUEUE_NAME, { connection });

  worker = new Worker<MailJobHarvestJobPayload>(
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

      // P0 stub — no crawl. P1 extracts links, scores prefs, creates applications.
      log.set({
        event: "mail_job_harvest_stub",
        jobId: job.id ?? null,
        messageId: parsed.data.messageId,
        userId: parsed.data.userId,
        enqueuedAt: parsed.data.enqueuedAt ?? null
      });
      log.emit();
    },
    { connection }
  );

  worker.on("failed", (job, err) => {
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
 * Enqueue a job-harvest stub after classify labels `job_notifier`.
 * No-op when queue was never started (no REDIS_URL).
 */
export async function enqueueMailJobHarvest(
  payload: MailJobHarvestJobPayload
): Promise<{ enqueued: boolean; jobId?: string }> {
  if (!queue) {
    return { enqueued: false };
  }

  const data: MailJobHarvestJobPayload = {
    ...payload,
    enqueuedAt: payload.enqueuedAt ?? new Date().toISOString()
  };

  const job = await queue.add(MAIL_JOB_HARVEST_JOB_NAME, data, {
    // Dedupe re-classify / double-delivery for the same message.
    jobId: `harvest:${data.userId}:${data.messageId}`,
    removeOnComplete: 1000,
    removeOnFail: 5000,
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 }
  });

  return { enqueued: true, jobId: job.id };
}

export async function stopMailJobHarvestQueue(): Promise<void> {
  await worker?.close();
  await queue?.close();
  worker = null;
  queue = null;
}
