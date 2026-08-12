import { Queue, type ConnectionOptions } from "bullmq";

import {
  MAIL_JOB_HARVEST_JOB_NAME,
  MAIL_JOB_HARVEST_QUEUE_NAME,
  type MailJobHarvestJobPayload
} from "@tsu-stack/core";
import { ENV_SERVER } from "@tsu-stack/env/server/env";
import { createLogger } from "@tsu-stack/logger/server";

type EnqueueFn = (input: {
  messageId: string;
  userId: string;
  /** When true, always enqueue a new BullMQ job (manual re-scan). */
  force?: boolean;
}) => Promise<boolean>;

/**
 * Optional override (tests / custom producers). Prefer direct Redis producer
 * so Vite dual-module graphs cannot leave scan with a null in-process hook.
 */
const HOOK_KEY = "__tsu_stack_mail_job_harvest_enqueue_hook__";
const QUEUE_KEY = "__tsu_stack_mail_job_harvest_producer_queue__";

type HookStore = { enqueueHook: EnqueueFn | null };

function hookStore(): HookStore {
  const g = globalThis as typeof globalThis & Record<string, HookStore | undefined>;
  g[HOOK_KEY] ??= { enqueueHook: null };
  return g[HOOK_KEY]!;
}

function bullConnection(redisUrl: string): ConnectionOptions {
  return {
    url: redisUrl,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    connectTimeout: 2_000
  };
}

/** Shared producer Queue (worker still lives in apps/server). */
function getProducerQueue(): Queue<MailJobHarvestJobPayload> | null {
  const redisUrl = ENV_SERVER.REDIS_URL;
  if (!redisUrl) return null;

  const g = globalThis as typeof globalThis &
    Record<string, Queue<MailJobHarvestJobPayload> | undefined>;
  g[QUEUE_KEY] ??= new Queue<MailJobHarvestJobPayload>(MAIL_JOB_HARVEST_QUEUE_NAME, {
    connection: bullConnection(redisUrl)
  });
  return g[QUEUE_KEY]!;
}

async function enqueueDirect(input: {
  messageId: string;
  userId: string;
  force?: boolean;
}): Promise<boolean> {
  const queue = getProducerQueue();
  if (!queue) return false;

  const data: MailJobHarvestJobPayload = {
    messageId: input.messageId,
    userId: input.userId,
    enqueuedAt: new Date().toISOString()
  };

  // BullMQ custom job ids cannot contain `:` (used as Redis key separators).
  const jobId = input.force
    ? `harvest_${data.userId}_${data.messageId}_${crypto.randomUUID()}`
    : `harvest_${data.userId}_${data.messageId}`;

  try {
    // Fail closed if Redis is slow/down — do not leave Scan hanging forever.
    await Promise.race([
      queue.add(MAIL_JOB_HARVEST_JOB_NAME, data, {
        jobId,
        removeOnComplete: 1000,
        removeOnFail: 5000,
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 }
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("mail-job-harvest enqueue timed out (3s)")), 3_000);
      })
    ]);
    const log = createLogger({ operation: "api__mail_job_harvest_enqueue" });
    log.set({
      event: "mail_job_harvest_enqueued",
      messageId: data.messageId,
      userId: data.userId,
      jobId,
      force: Boolean(input.force)
    });
    log.emit();
    return true;
  } catch (error) {
    // Duplicate jobId (non-force path) is expected; anything else is real failure.
    const message = error instanceof Error ? error.message : String(error);
    if (/already exists|JobId/i.test(message) && !input.force) {
      const log = createLogger({ operation: "api__mail_job_harvest_enqueue" });
      log.set({
        event: "mail_job_harvest_enqueue_duplicate",
        messageId: data.messageId,
        userId: data.userId,
        jobId,
        force: false
      });
      log.emit();
      return false;
    }
    const log = createLogger({ operation: "api__mail_job_harvest_enqueue" });
    log.error(error instanceof Error ? error : new Error(message), {
      event: "mail_job_harvest_enqueue_failed",
      messageId: data.messageId,
      userId: data.userId,
      jobId,
      force: Boolean(input.force)
    });
    log.emit({ _forceKeep: true });
    return false;
  }
}

/** Optional: server may still inject BullMQ producer (tests / alternate wiring). */
export function registerMailJobHarvestEnqueue(fn: EnqueueFn): void {
  hookStore().enqueueHook = fn;
}

export async function requestMailJobHarvest(input: {
  messageId: string;
  userId: string;
  force?: boolean;
}): Promise<boolean> {
  // Always use the API-local Redis producer first. A registered hook can
  // close over a Vite dual-module Queue that was never started (returns
  // false forever) — that is what made Scan look "Redis unavailable".
  const direct = await enqueueDirect(input);
  if (direct) return true;

  const hook = hookStore().enqueueHook;
  if (!hook) return false;
  try {
    return await hook(input);
  } catch (error) {
    const log = createLogger({ operation: "api__mail_job_harvest_enqueue" });
    log.error(error instanceof Error ? error : new Error(String(error)), {
      event: "mail_job_harvest_hook_failed"
    });
    log.emit({ _forceKeep: true });
    return false;
  }
}
