import { z } from "zod";

import { DEFAULT_AI_MODELS } from "./constants";
import { getMastraProvider } from "./mastra-provider-catalog";
import { type AiFeature, AiModelIdSchema } from "./types";

/**
 * Per-run LLM credentials resolved on the server from user AI settings (BYO).
 * Passed into agent workflows over the authenticated agent channel.
 * Never log `apiKey`.
 *
 * Product rule: BYO only — no process.env provider keys on the agent.
 */
export const RuntimeLlmConfigSchema = z.object({
  /** Mastra model router id: `provider/model` (e.g. deepseek/deepseek-v4-flash). */
  modelId: AiModelIdSchema,
  /** Provider id prefix of modelId (or custom). */
  providerKind: z.string().min(1).max(64),
  /**
   * Decrypted BYO key when the user configured one for this provider.
   * Required for LLM steps; omit only when the step can degrade to heuristic.
   */
  apiKey: z.string().min(1).max(512).optional()
});
export type RuntimeLlmConfig = z.infer<typeof RuntimeLlmConfigSchema>;

/**
 * requestContext keys for hub chat / HTTP agent.generate.
 * API and agent must use the same strings.
 */
export const LLM_REQUEST_CONTEXT_KEYS = {
  modelId: "llmModelId",
  apiKey: "llmApiKey",
  providerKind: "llmProviderKind"
} as const;

/** Parse `provider` from `provider/model` router ids. */
export function providerKindFromModelId(modelId: string): string | null {
  const slash = modelId.indexOf("/");
  if (slash <= 0) return null;
  const kind = modelId.slice(0, slash).trim();
  return kind.length > 0 ? kind : null;
}

/** Env var names Mastra documents for a provider (catalog / docs only). */
export function envVarsForProviderKind(providerKind: string): readonly string[] {
  return getMastraProvider(providerKind)?.apiKeyEnvVars ?? [];
}

export function defaultModelIdForFeature(feature: AiFeature): string {
  return DEFAULT_AI_MODELS[feature];
}

/** True when modelId looks like Mastra `provider/model`. */
export function isMastraRouterModelId(modelId: string): boolean {
  return providerKindFromModelId(modelId) !== null;
}

/** Build requestContext fields for Mastra agent HTTP (hub chat). */
export function llmRequestContextFields(llm: RuntimeLlmConfig): Record<string, string> {
  return {
    [LLM_REQUEST_CONTEXT_KEYS.modelId]: llm.modelId,
    [LLM_REQUEST_CONTEXT_KEYS.providerKind]: llm.providerKind,
    ...(llm.apiKey ? { [LLM_REQUEST_CONTEXT_KEYS.apiKey]: llm.apiKey } : {})
  };
}
