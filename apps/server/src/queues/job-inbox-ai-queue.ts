import { Queue, Worker, type ConnectionOptions, type Job } from "bullmq";

import { runInboxAi } from "@tsu-stack/api/lib/job-discovery/inbox-ai";
import {
  JOB_INBOX_AI_JOB_NAME,
  JOB_INBOX_AI_QUEUE_NAME,
  JobInboxAiPayloadSchema,
  type JobInboxAiPayload
} from "@tsu-stack/core";
import { createDb, runWithDb } from "@tsu-stack/db";
import { createLogger } from "@tsu-stack/logger/server";

/**
 * Per-application inbox AI (score + take).
 *
 * jobId `inboxai_${applicationId}` while waiting/active. Remove on complete/fail
 * so a later retry can reuse the id (or callers can mint a new one).
 */

const STORE_KEY = "__tsu_stack_job_inbox_ai_server_store__";

type QueueStore = {
  queue: Queue<JobInboxAiPayload> | null;
  worker: Worker<JobInboxAiPayload> | null;
};

function store(): QueueStore {
  const g = globalThis as typeof globalThis & Record<string, QueueStore | undefined>;
  g[STORE_KEY] ??= { queue: null, worker: null };
  return g[STORE_KEY]!;
}

function bullConnection(redisUrl: string): ConnectionOptions {
  return { url: redisUrl, maxRetriesPerRequest: null };
}

export function inboxAiJobId(applicationId: string): string {
  return `inboxai_${applicationId}`;
}

export function startJobInboxAiQueue(redisUrl: string): void {
  const s = store();
  if (s.queue) return;

  const connection = bullConnection(redisUrl);
  s.queue = new Queue<JobInboxAiPayload>(JOB_INBOX_AI_QUEUE_NAME, { connection });

  s.worker = new Worker<JobInboxAiPayload>(
    JOB_INBOX_AI_QUEUE_NAME,
    async (job: Job<JobInboxAiPayload>) => {
      const log = createLogger({ operation: "server__job_inbox_ai_job" });
      const parsed = JobInboxAiPayloadSchema.safeParse(job.data);
      if (!parsed.success) {
        log.set({
          event: "job_inbox_ai_job_invalid",
          jobId: job.id ?? null,
          issues: parsed.error.issues.map((issue) => issue.message)
        });
        log.emit({ _forceKeep: true });
        throw new Error(
          `Invalid job-inbox-ai payload: ${parsed.error.issues.map((i) => i.message).join("; ")}`
        );
      }

      const db = createDb();
      const result = await runWithDb(db, () =>
        runInboxAi({
          userId: parsed.data.userId,
          applicationId: parsed.data.applicationId,
          runId: parsed.data.runId
        })
      );

      log.set({
        event: "job_inbox_ai_ok",
        jobId: job.id ?? null,
        userId: parsed.data.userId,
        applicationId: parsed.data.applicationId,
        runId: parsed.data.runId,
        outcome: result.outcome
      });
      log.emit();
    },
    { connection }
  );

  s.worker.on("failed", (job, err) => {
    const log = createLogger({ operation: "server__job_inbox_ai_job" });
    log.error(err instanceof Error ? err : new Error(String(err)), {
      event: "job_inbox_ai_job_failed",
      jobId: job?.id ?? null
    });
    log.emit({ _forceKeep: true });
  });

  const boot = createLogger({ operation: "server__job_inbox_ai_queue" });
  boot.set({ event: "job_inbox_ai_queue_started", queue: JOB_INBOX_AI_QUEUE_NAME });
  boot.emit();
}

async function removeFinishedInboxAiJob(
  queue: Queue<JobInboxAiPayload>,
  jobId: string
): Promise<void> {
  const existing = await queue.getJob(jobId);
  if (!existing) return;
  const state = await existing.getState();
  if (state === "completed" || state === "failed") {
    await existing.remove();
  }
}

export async function enqueueJobInboxAi(
  payload: JobInboxAiPayload
): Promise<{ enqueued: boolean; jobId?: string }> {
  const s = store();
  if (!s.queue) {
    return { enqueued: false };
  }

  const jobId = inboxAiJobId(payload.applicationId);

  try {
    await removeFinishedInboxAiJob(s.queue, jobId);
    const job = await s.queue.add(JOB_INBOX_AI_JOB_NAME, payload, {
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
    const log = createLogger({ operation: "server__job_inbox_ai_queue" });
    log.error(error instanceof Error ? error : new Error(message), {
      event: "job_inbox_ai_enqueue_failed",
      jobId
    });
    log.emit({ _forceKeep: true });
    return { enqueued: false };
  }
}

export async function stopJobInboxAiQueue(): Promise<void> {
  const s = store();
  await s.worker?.close();
  await s.queue?.close();
  s.worker = null;
  s.queue = null;
}
