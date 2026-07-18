import { type GitHubCacheKv } from "#@/runtime/bindings";

type RedisLike = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { EX?: number }): Promise<string | null>;
  del(...keys: string[]): Promise<number>;
};

function shortKey(key: string): string {
  if (key.length <= 60) return key;
  return `${key.slice(0, 50)}…${key.slice(-10)}`;
}

export function createRedisCacheAdapter(redis: RedisLike): GitHubCacheKv {
  return {
    get: async (key: string, type?: "text" | "json"): Promise<unknown> => {
      const raw = await redis.get(key);
      if (raw) {
        console.log(`[cache:redis] HIT  ${shortKey(key)} (${(raw.length / 1024).toFixed(1)}kb)`);
      } else {
        console.log(`[cache:redis] MISS ${shortKey(key)}`);
      }
      if (!raw) return null;
      if (type === "json") return JSON.parse(raw) as unknown;
      return raw;
    },

    async put(
      key: string,
      value: string,
      options?: { expirationTtl?: number; metadata?: unknown }
    ): Promise<void> {
      if (options?.expirationTtl) {
        await redis.set(key, value, { EX: options.expirationTtl });
        console.log(
          `[cache:redis] PUT  ${shortKey(key)} ttl=${options.expirationTtl}s (${(value.length / 1024).toFixed(1)}kb)`
        );
      } else {
        await redis.set(key, value);
        console.log(`[cache:redis] PUT  ${shortKey(key)} no-ttl (${(value.length / 1024).toFixed(1)}kb)`);
      }
    },

    async delete(key: string): Promise<void> {
      const deleted = await redis.del(key);
      console.log(`[cache:redis] DEL  ${shortKey(key)} removed=${deleted}`);
    }
  } as GitHubCacheKv;
}
