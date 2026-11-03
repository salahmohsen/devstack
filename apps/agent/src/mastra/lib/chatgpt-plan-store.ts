import { type ChatgptPlanCredentials, type ChatgptPlanTokenStore } from "@tsu-stack/core";
import { userChatgptPlanRepository } from "@tsu-stack/db";

import { openSecret, sealSecret } from "#@/mastra/lib/open-secret";

function openCredentials(ciphertext: string | null): ChatgptPlanCredentials | null {
  const plain = openSecret(ciphertext);
  if (!plain) return null;
  try {
    return JSON.parse(plain) as ChatgptPlanCredentials;
  } catch {
    return null;
  }
}

/** Parity with the API-side store: same sealed format, same per-user advisory lock. */
export const chatgptPlanTokenStore: ChatgptPlanTokenStore = {
  async read(userId) {
    const row = await userChatgptPlanRepository.findByUserId(userId);
    if (!row || row.needsReconnect) return null;
    return openCredentials(row.credentialsCiphertext);
  },
  withUserLock(userId, fn) {
    return userChatgptPlanRepository.withCredentialsLock(userId, (ctx) =>
      fn({
        current: ctx.needsReconnect ? null : openCredentials(ctx.credentialsCiphertext),
        save: async (next) => {
          const credentialsCiphertext = sealSecret(JSON.stringify(next));
          if (!credentialsCiphertext) throw new Error("BETTER_AUTH_SECRET is not set");
          await ctx.save({
            credentialsCiphertext,
            scopes: next.scopes,
            accessExpiresAt: new Date(next.accessExpiresAt)
          });
        },
        markNeedsReconnect: ctx.markNeedsReconnect
      })
    );
  }
};
