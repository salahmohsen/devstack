import {
  defaultModelIdForFeature,
  isMastraRouterModelId,
  providerKindFromModelId,
  type AiFeature,
  type RuntimeLlmConfig
} from "@tsu-stack/core";
import { createDb, runWithDb, userAiSettingsRepository } from "@tsu-stack/db";

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
