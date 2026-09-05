import { Queue, type ConnectionOptions } from "bullmq";

import {
  JOB_DISCOVERY_LAND_JOB_NAME,
  JOB_DISCOVERY_LAND_QUEUE_NAME,
  JOB_INBOX_AI_JOB_NAME,
  JOB_INBOX_AI_QUEUE_NAME,
  JobDiscoveryLandPayloadSchema,
  JobInboxAiPayloadSchema,
  inboxAiQueueJobId,
  landJobId,
  type JobDiscoveryLandPayload,
  type JobInboxAiPayload
} from "@tsu-stack/core";
import { ENV_SERVER } from "@tsu-stack/env/server/env";
import { createLogger } from "@tsu-stack/logger/server";

type EnqueueOpts = { delayMs?: number };

type EnqueueFn<T> = (input: T, opts?: EnqueueOpts) => Promise<boolean>;

type HookStore<T> = { enqueueHook: EnqueueFn<T> | null };

function hookStore<T>(key: string): HookStore<T> {
  const g = globalThis as typeof globalThis & Record<string, HookStore<T> | undefined>;
  g[key] ??= { enqueueHook: null };
  return g[key]!;
}

function bullConnection(redisUrl: string): ConnectionOptions {
  return {
    url: redisUrl,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    connectTimeout: 2_000
  };
}

function getProducerQueue(queueKey: string, queueName: string): Queue | null {
  const redisUrl = ENV_SERVER.REDIS_URL;
  if (!redisUrl) return null;

  const g = globalThis as typeof globalThis & Record<string, Queue | undefined>;
  g[queueKey] ??= new Queue(queueName, {
    connection: bullConnection(redisUrl)
  });
  return g[queueKey]!;
}

async function coalesceOrRemoveFinished(
  queue: Queue,
  jobId: string
): Promise<"coalesced" | "free"> {
  const existing = await queue.getJob(jobId);
  if (!existing) return "free";
  const state = await existing.getState();
  if (state === "completed" || state === "failed") {
    await existing.remove();
    return "free";
  }
  return "coalesced";
}

async function enqueueDirect(input: {
  queueKey: string;
  queueName: string;
  jobName: string;
  data: unknown;
  operation: string;
  event: string;
  extra?: Record<string, unknown>;
  jobId?: string;
  delayMs?: number;
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
}): Promise<boolean> {
  const queue = getProducerQueue(input.queueKey, input.queueName);
  if (!queue) return false;

  try {
    const result = await Promise.race([
      (async () => {
        if (input.jobId) {
          const gate = await coalesceOrRemoveFinished(queue, input.jobId);
          if (gate === "coalesced") return "coalesced" as const;
        }
        await queue.add(input.jobName, input.data, {
          jobId: input.jobId,
          delay: input.delayMs,
          removeOnComplete: input.removeOnComplete ?? 1000,
          removeOnFail: input.removeOnFail ?? 5000,
          attempts: 3,
          backoff: { type: "exponential", delay: 2000 }
        });
        return "added" as const;
      })(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`${input.queueName} enqueue timed out (3s)`)), 3_000);
      })
    ]);
    const log = createLogger({ operation: input.operation });
    log.set({
      event: result === "coalesced" ? `${input.event}_duplicate` : input.event,
      ...input.extra
    });
    log.emit();
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/already exists|JobId/i.test(message)) {
      const log = createLogger({ operation: input.operation });
      log.set({
        event: `${input.event}_duplicate`,
        ...input.extra
      });
      log.emit();
      return true;
    }
    const log = createLogger({ operation: input.operation });
    log.error(error instanceof Error ? error : new Error(message), {
      event: `${input.event}_failed`,
      ...input.extra
    });
    log.emit({ _forceKeep: true });
    return false;
  }
}

async function requestWithHook<T>(input: {
  hookKey: string;
  queueKey: string;
  queueName: string;
  jobName: string;
  data: T;
  operation: string;
  event: string;
  extra?: Record<string, unknown>;
  jobId?: string;
  delayMs?: number;
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
}): Promise<boolean> {
  const direct = await enqueueDirect(input);
  if (direct) return true;

  const hook = hookStore<T>(input.hookKey).enqueueHook;
  if (!hook) return false;
  try {
    return await hook(
      input.data,
      input.delayMs === undefined ? undefined : { delayMs: input.delayMs }
    );
  } catch (error) {
    const log = createLogger({ operation: input.operation });
    log.error(error instanceof Error ? error : new Error(String(error)), {
      event: `${input.event}_hook_failed`
    });
    log.emit({ _forceKeep: true });
    return false;
  }
}

const LAND_HOOK_KEY = "__tsu_stack_job_discovery_land_enqueue_hook__";
const LAND_QUEUE_KEY = "__tsu_stack_job_discovery_land_producer_queue__";
const INBOX_AI_HOOK_KEY = "__tsu_stack_job_inbox_ai_enqueue_hook__";
const INBOX_AI_QUEUE_KEY = "__tsu_stack_job_inbox_ai_producer_queue__";

export function registerJobDiscoveryLandEnqueue(fn: EnqueueFn<JobDiscoveryLandPayload>): void {
  hookStore<JobDiscoveryLandPayload>(LAND_HOOK_KEY).enqueueHook = fn;
}

export function registerJobInboxAiEnqueue(fn: EnqueueFn<JobInboxAiPayload>): void {
  hookStore<JobInboxAiPayload>(INBOX_AI_HOOK_KEY).enqueueHook = fn;
}

export async function requestJobDiscoveryLand(
  input: Omit<JobDiscoveryLandPayload, "enqueuedAt">,
  opts?: EnqueueOpts
): Promise<boolean> {
  const data = JobDiscoveryLandPayloadSchema.parse({
    ...input,
    enqueuedAt: new Date().toISOString()
  });
  return requestWithHook({
    hookKey: LAND_HOOK_KEY,
    queueKey: LAND_QUEUE_KEY,
    queueName: JOB_DISCOVERY_LAND_QUEUE_NAME,
    jobName: JOB_DISCOVERY_LAND_JOB_NAME,
    data,
    operation: "api__job_discovery_land_enqueue",
    event: "job_discovery_land_enqueued",
    extra: { userId: data.userId, runId: data.runId, trigger: data.trigger },
    jobId: landJobId(data.userId, data.runId),
    delayMs: opts?.delayMs,
    removeOnComplete: true,
    removeOnFail: true
  });
}

export async function requestJobInboxAi(input: JobInboxAiPayload): Promise<boolean> {
  const data = JobInboxAiPayloadSchema.parse(input);
  return requestWithHook({
    hookKey: INBOX_AI_HOOK_KEY,
    queueKey: INBOX_AI_QUEUE_KEY,
    queueName: JOB_INBOX_AI_QUEUE_NAME,
    jobName: JOB_INBOX_AI_JOB_NAME,
    data,
    operation: "api__job_inbox_ai_enqueue",
    event: "job_inbox_ai_enqueued",
    extra: {
      userId: data.userId,
      runId: data.runId,
      jobId: data.jobId ?? null,
      applicationId: data.applicationId ?? null
    },
    jobId: inboxAiQueueJobId(data),
    removeOnComplete: true,
    removeOnFail: true
  });
}
