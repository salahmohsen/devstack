import {
  defaultModelIdForFeature,
  isMastraRouterModelId,
  providerKindFromModelId,
  type AiFeature,
  type RuntimeLlmConfig
} from "@tsu-stack/core";
import { userAiSettingsRepository } from "@tsu-stack/db";

import { openSecret } from "#@/lib/settings/seal-secret";

/**
 * Resolve feature model + optional decrypted BYO API key for agent runs.
 *
 * Source of truth: Settings → AI (`user_ai_settings`).
 * Product rule: BYO only — agent does not use operator provider env keys.
 */
export async function resolveRuntimeAiCredentials(
  userId: string,
  feature: AiFeature
): Promise<RuntimeLlmConfig> {
  const row = await userAiSettingsRepository.findByUserId(userId);
  const fromSettings = row?.models?.[feature]?.trim();
  let modelId =
    fromSettings && fromSettings.length > 0 ? fromSettings : defaultModelIdForFeature(feature);

  if (!isMastraRouterModelId(modelId)) {
    // Bare model names are not routable; fall back to product default.
    modelId = defaultModelIdForFeature(feature);
  }

  const providerKind = providerKindFromModelId(modelId) ?? "deepseek";
  const providers = row?.providers ?? [];

  // Prefer a provider whose kind matches the model router prefix and has a sealed key.
  const matched =
    providers.find((p) => p.kind === providerKind && p.apiKeyCiphertext) ??
    providers.find((p) => p.kind === providerKind) ??
    null;

  const apiKey = matched ? openSecret(matched.apiKeyCiphertext) : null;

  return {
    modelId,
    providerKind,
    ...(apiKey ? { apiKey } : {})
  };
}
