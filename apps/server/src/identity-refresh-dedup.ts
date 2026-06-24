import { type OrpcContext } from "@tsu-stack/api/lib/context/types";

const DELIVERY_TTL_SECONDS = 7 * 24 * 60 * 60;

export async function isAlreadyProcessed(ctx: OrpcContext, deliveryId: string): Promise<boolean> {
  const kv = ctx.github.binding.kv;
  if (!kv) {
    throw new Error("GITHUB_CACHE_KV binding is not available.");
  }
  const key = `identity-refresh:delivery:${deliveryId}`;
  const existing = await kv.get(key);
  if (existing) return true;
  await kv.put(key, new Date().toISOString(), {
    expirationTtl: DELIVERY_TTL_SECONDS
  });
  return false;
}
