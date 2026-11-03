import {
  CHATGPT_PLAN_LIMIT_PAUSE_MS,
  CHATGPT_PLAN_PROVIDER_KIND,
  chatgptPlanError,
  defaultModelIdForFeature,
  getFreshAccessToken,
  isMastraRouterModelId,
  providerKindFromModelId,
  type AiFeature,
  type RuntimeLlmConfig
} from "@tsu-stack/core";
import {
  createDb,
  runWithDb,
  userAiSettingsRepository,
  userChatgptPlanRepository
} from "@tsu-stack/db";

import { chatgptPlanTokenStore } from "#@/mastra/lib/chatgpt-plan-store";
import { openSecret } from "#@/mastra/lib/open-secret";

/**
 * Resolve feature model + optional decrypted BYO API key for agent runs.
 * Parity with packages/api `resolveRuntimeAiCredentials` — BYO only, no env keys.
 */
export async function resolveRuntimeAiCredentials(
  userId: string,
  feature: AiFeature
): Promise<RuntimeLlmConfig> {
  const db = createDb();
  const row = await runWithDb(db, () => userAiSettingsRepository.findByUserId(userId));
  const fromSettings = row?.models?.[feature]?.trim();
  let modelId =
    fromSettings && fromSettings.length > 0 ? fromSettings : defaultModelIdForFeature(feature);

  if (!isMastraRouterModelId(modelId)) {
    modelId = defaultModelIdForFeature(feature);
  }

  const providerKind = providerKindFromModelId(modelId) ?? "deepseek";

  if (providerKind === CHATGPT_PLAN_PROVIDER_KIND) {
    const plan = await runWithDb(db, () => userChatgptPlanRepository.findByUserId(userId));
    if (
      plan?.lastErrorCode === "CHATGPT_PLAN_LIMIT" &&
      plan.lastErrorAt &&
      Date.now() - plan.lastErrorAt.getTime() < CHATGPT_PLAN_LIMIT_PAUSE_MS
    ) {
      throw chatgptPlanError("CHATGPT_PLAN_LIMIT");
    }
    const apiKey = await runWithDb(db, () =>
      getFreshAccessToken({ userId, store: chatgptPlanTokenStore, fetch })
    );
    return { modelId, providerKind, apiKey, planUserId: userId };
  }
  const providers = row?.providers ?? [];
  const boundId = row?.modelProviderIds?.[feature]?.trim();

  let provider = boundId ? providers.find((p) => p.id === boundId) : undefined;

  if (!provider || provider.kind !== providerKind) {
    provider =
      providers.find((p) => p.kind === providerKind && p.apiKeyCiphertext) ??
      providers.find((p) => p.kind === providerKind) ??
      undefined;
  }

  const apiKey = provider ? openSecret(provider.apiKeyCiphertext) : null;

  return {
    modelId,
    providerKind,
    ...(apiKey ? { apiKey } : {})
  };
}
