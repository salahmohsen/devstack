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
 *
 * Provider binding: prefer `modelProviderIds[feature]` when the row exists and
 * its kind matches `providerKindFromModelId(modelId)`; otherwise first matching kind.
 */
export async function resolveRuntimeAiCredentials(
  userId: string,
  feature: AiFeature,
  override?: { modelId?: string | null; providerId?: string | null }
): Promise<RuntimeLlmConfig> {
  const row = await userAiSettingsRepository.findByUserId(userId);
  const overrideModel = override?.modelId?.trim();
  const fromSettings = row?.models?.[feature]?.trim();
  let modelId =
    overrideModel && overrideModel.length > 0
      ? overrideModel
      : fromSettings && fromSettings.length > 0
        ? fromSettings
        : defaultModelIdForFeature(feature);

  if (!isMastraRouterModelId(modelId)) {
    // Bare model names are not routable; fall back to product default.
    modelId = defaultModelIdForFeature(feature);
  }

  const providerKind = providerKindFromModelId(modelId) ?? "deepseek";
  const providers = row?.providers ?? [];
  const overrideProviderId = override?.providerId?.trim();
  const boundId = overrideProviderId ?? row?.modelProviderIds?.[feature]?.trim();

  let provider = boundId ? providers.find((p) => p.id === boundId) : undefined;

  // Orphan: missing row, or kind mismatch vs modelId prefix → first matching kind.
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
