import Redis from "ioredis";

import { createFiles } from "@tsu-stack/api/lib/storage/index";
import { ENV_SERVER } from "@tsu-stack/env/server/env";

export type NodeRuntime = {
  broadcastSignals: (keys: string[]) => void;
  files: {
    put(
      key: string,
      value: ReadableStream | ArrayBuffer | FormData | string,
      options?: { httpMetadata?: { contentType?: string } }
    ): Promise<{ key: string }>;
    get(key: string): Promise<{ body: ReadableStream | null; key: string } | null>;
    delete(key: string): Promise<void>;
  };
  redis: {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, options?: { EX?: number }): Promise<string | null>;
    del(...keys: string[]): Promise<number>;
    ping(): Promise<string>;
  };
  agentWorkerUrl: string | undefined;
};

let _runtime: NodeRuntime | null = null;

export function initRuntime(): NodeRuntime {
  if (_runtime) return _runtime;

  const redisUrl = ENV_SERVER.REDIS_URL ?? "redis://localhost:6379";
  const redis = new Redis(redisUrl, {
    enableOfflineQueue: true,
    lazyConnect: true,
    retryStrategy(times) {
      if (times > 10) return null;
      return Math.min(times * 200, 5000);
    },
    maxRetriesPerRequest: 3
  });
  redis.on("error", () => {});
  redis.connect().catch(() => {});

  const rawFiles = createFiles();

  _runtime = {
    redis: {
      get: (key) => redis.get(key).catch(() => null),
      set: (key, value, opts) =>
        (opts?.EX ? redis.set(key, value, "EX", opts.EX) : redis.set(key, value)).catch(() => null),
      del: (...keys) => redis.del(...keys).catch(() => 0),
      ping: () => redis.ping().catch(() => "PONG")
    },
    files: {
      async put(key, value, options) {
        const body =
          value instanceof ReadableStream
            ? value
            : value instanceof ArrayBuffer
              ? new Blob([value])
              : value;
        await rawFiles.upload(key, body as Blob | ReadableStream, {
          contentType: options?.httpMetadata?.contentType
        });
        return { key };
      },
      async get(key) {
        try {
          const file = await rawFiles.download(key);
          return { body: file.stream(), key: file.key };
        } catch {
          return null;
        }
      },
      async delete(key) {
        await rawFiles.delete(key);
      }
    },
    broadcastSignals: () => {},
    agentWorkerUrl: ENV_SERVER.AGENT_WORKER_URL
  };
  return _runtime;
}

export function getRuntime(): NodeRuntime {
  if (!_runtime) throw new Error("Runtime not initialized");
  return _runtime;
}

export function setBroadcastSignals(fn: (keys: string[]) => void) {
  if (_runtime) _runtime.broadcastSignals = fn;
}
