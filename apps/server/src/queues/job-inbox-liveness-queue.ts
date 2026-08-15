import { Queue, Worker, type ConnectionOptions, type Job } from "bullmq";

import { JOB_INBOX_LIVENESS_JOB_NAME, JOB_INBOX_LIVENESS_QUEUE_NAME } from "@tsu-stack/core";
import { createLogger } from "@tsu-stack/logger/server";

/**
 * Inbox TTL + HTTP liveness tick.
 *
 * Stub no-op until Task 15. Repeat (12h) is registered now so the schedule
 * exists before the real worker lands.
 */

const STORE_KEY = "__tsu_stack_job_inbox_liveness_server_store__";
const LIVENESS_TICK_INTERVAL_MS = 12 * 60 * 60 * 1000;
const LIVENESS_TICK_JOB_ID = "job-inbox-liveness-tick";

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

export function startJobInboxLivenessQueue(redisUrl: string): void {
  const s = store();
  if (s.queue) return;

  const connection = bullConnection(redisUrl);
  s.queue = new Queue<TickPayload>(JOB_INBOX_LIVENESS_QUEUE_NAME, { connection });

  s.worker = new Worker<TickPayload>(
    JOB_INBOX_LIVENESS_QUEUE_NAME,
    async (_job: Job<TickPayload>) => {
      // Task 15: runInboxLivenessTick
    },
    { connection, concurrency: 1 }
  );

  s.worker.on("failed", (job, err) => {
    const log = createLogger({ operation: "server__job_inbox_liveness_job" });
    log.error(err instanceof Error ? err : new Error(String(err)), {
      event: "job_inbox_liveness_job_failed",
      jobId: job?.id ?? null
    });
    log.emit({ _forceKeep: true });
  });

  void s.queue.add(
    JOB_INBOX_LIVENESS_JOB_NAME,
    {},
    {
      jobId: LIVENESS_TICK_JOB_ID,
      repeat: { every: LIVENESS_TICK_INTERVAL_MS },
      removeOnComplete: 50,
      removeOnFail: 100
    }
  );

  const boot = createLogger({ operation: "server__job_inbox_liveness_queue" });
  boot.set({
    event: "job_inbox_liveness_queue_started",
    queue: JOB_INBOX_LIVENESS_QUEUE_NAME,
    intervalMs: LIVENESS_TICK_INTERVAL_MS,
    stub: true
  });
  boot.emit();
}

export async function stopJobInboxLivenessQueue(): Promise<void> {
  const s = store();
  await s.worker?.close();
  await s.queue?.close();
  s.worker = null;
  s.queue = null;
}
