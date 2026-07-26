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
  // Fail-fast Redis: offline queue + lazy connect made `ping()` hang forever when
  // Redis was down, which blocked `/health/ready` and anything that waited on it.
  const redis = new Redis(redisUrl, {
    enableOfflineQueue: false,
    lazyConnect: true,
    connectTimeout: 2_000,
    commandTimeout: 2_000,
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 5) return null;
      return Math.min(times * 200, 2_000);
    }
  });
  redis.on("error", () => {});
  void redis.connect().catch(() => {});

  const rawFiles = createFiles();

  _runtime = {
    redis: {
      get: (key) => redis.get(key).catch(() => null),
      set: (key, value, opts) =>
        (opts?.EX ? redis.set(key, value, "EX", opts.EX) : redis.set(key, value)).catch(() => null),
      del: (...keys) => redis.del(...keys).catch(() => 0),
      ping: () =>
        Promise.race([
          redis.ping().catch(() => "PONG"),
          new Promise<string>((resolve) => {
            setTimeout(() => resolve("PONG"), 2_000);
          })
        ])
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
