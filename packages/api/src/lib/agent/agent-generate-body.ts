import { llmRequestContextFields, type RuntimeLlmConfig } from "@tsu-stack/core";

/**
 * Mastra HTTP `/api/agents/:id/generate` (and related chat routes) body shape.
 *
 * Mastra's request schema expects `model` as an optional **string** (router id),
 * not `{ id, apiKey }`. Product BYO credentials must travel on `requestContext`
 * (`llmModelId` / `llmApiKey` / `llmProviderKind`) so agent
 * `byoModelFromRequestContext` can resolve the key.
 *
 * Never put `apiKey` on `model` — it fails body validation with 400.
 */
export function agentGenerateBody(input: {
  messages: unknown;
  llm: RuntimeLlmConfig;
  /** Extra requestContext keys (e.g. userId). */
  requestContext?: Record<string, unknown>;
  modelSettings?: Record<string, unknown>;
  maxSteps?: number;
  memory?: Record<string, unknown>;
  /** Optional string model id override only — not an object. */
  modelId?: string;
  /** Extra top-level fields (e.g. chat `trigger`). */
  extras?: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    messages: input.messages,
    ...(input.modelId?.trim() ? { model: input.modelId.trim() } : {}),
    ...(input.modelSettings ? { modelSettings: input.modelSettings } : {}),
    ...(input.maxSteps != null ? { maxSteps: input.maxSteps } : {}),
    ...(input.memory ? { memory: input.memory } : {}),
    ...input.extras,
    requestContext: {
      ...input.requestContext,
      ...llmRequestContextFields(input.llm)
    }
  };
}
