export type GitHubCacheKv = {
  delete(key: string): Promise<void>;
  get<T>(key: string, type: "json"): Promise<T | null>;
  get(key: string, type?: "text"): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: {
      expirationTtl?: number;
      metadata?: unknown;
    }
  ): Promise<void>;
};

export type GitHubRuntimeBindings = {
  kv?: GitHubCacheKv;
  broadcast?: (signalKeys: string[]) => void;
};

export { createRedisCacheAdapter } from "#@/infrastructure/cache/redis-cache-adapter";
