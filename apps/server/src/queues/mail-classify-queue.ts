import { Queue, Worker, type ConnectionOptions, type Job } from "bullmq";

import {
  MAIL_CLASSIFY_JOB_NAME,
  MAIL_CLASSIFY_QUEUE_NAME,
  MailClassifyJobPayloadSchema,
  type MailClassifyJobPayload
} from "@tsu-stack/core";
import { createLogger } from "@tsu-stack/logger/server";

/**
 * Career Inbox classify queue scaffold.
 *
 * - Shares `REDIS_URL` with Socket.IO adapter / GitHub cache (no second Redis stack).
 * - Producer: {@link enqueueMailClassify}
 * - Worker: logs job payload; Mastra classify is a later epic.
 *
 * Run: started from `apps/server` when `REDIS_URL` is set (`src/index.ts`).
 * Env: `REDIS_URL` (optional — without it, enqueue is a no-op and worker is not started).
 */

let queue: Queue<MailClassifyJobPayload> | null = null;
let worker: Worker<MailClassifyJobPayload> | null = null;

function bullConnection(redisUrl: string): ConnectionOptions {
  // BullMQ expects ioredis-compatible connection options; URL form is fine.
  return { url: redisUrl, maxRetriesPerRequest: null };
}

export function startMailClassifyQueue(redisUrl: string): void {
  if (queue) return;

  const connection = bullConnection(redisUrl);
  queue = new Queue<MailClassifyJobPayload>(MAIL_CLASSIFY_QUEUE_NAME, { connection });

  worker = new Worker<MailClassifyJobPayload>(
    MAIL_CLASSIFY_QUEUE_NAME,
    async (job: Job<MailClassifyJobPayload>) => {
      const log = createLogger({ operation: "server__mail_classify_job" });
      const parsed = MailClassifyJobPayloadSchema.safeParse(job.data);
      if (!parsed.success) {
        log.set({
          event: "mail_classify_job_invalid",
          jobId: job.id ?? null,
          issues: parsed.error.issues.map((issue) => issue.message)
        });
        log.emit();
        return;
      }

      // Stub: full Mastra classify (labels + CRM effects + undo) is a later epic.
      log.set({
        event: "mail_classify_job_stub",
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
    const log = createLogger({ operation: "server__mail_classify_job" });
    log.error(err instanceof Error ? err : new Error(String(err)), {
      event: "mail_classify_job_failed",
      jobId: job?.id ?? null
    });
    log.emit({ _forceKeep: true });
  });

  const boot = createLogger({ operation: "server__mail_classify_queue" });
  boot.set({ event: "mail_classify_queue_started", queue: MAIL_CLASSIFY_QUEUE_NAME });
  boot.emit();
}

/**
 * Enqueue a classify job after inbound persist.
 * No-op when queue was never started (no REDIS_URL).
 */
export async function enqueueMailClassify(
  payload: MailClassifyJobPayload
): Promise<{ enqueued: boolean; jobId?: string }> {
  if (!queue) {
    return { enqueued: false };
  }

  const data: MailClassifyJobPayload = {
    ...payload,
    enqueuedAt: payload.enqueuedAt ?? new Date().toISOString()
  };

  const job = await queue.add(MAIL_CLASSIFY_JOB_NAME, data, {
    // Dedupe rapid double-delivery of same message.
    jobId: `classify:${data.userId}:${data.messageId}`,
    removeOnComplete: 1000,
    removeOnFail: 5000,
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 }
  });

  return { enqueued: true, jobId: job.id };
}

export async function stopMailClassifyQueue(): Promise<void> {
  await worker?.close();
  await queue?.close();
  worker = null;
  queue = null;
}
