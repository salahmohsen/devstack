import { llmRequestContextFields, type RuntimeLlmConfig } from "@tsu-stack/core";

/**
 * Mastra HTTP generate / chat body shape.
 *
 * Do **not** set top-level `model` to a router id string. Mastra then
 * instantiates that string via the model router and looks up
 * `process.env.<PROVIDER>_API_KEY`, ignoring Settings BYO keys.
 *
 * Composer / feature model + decrypted key travel on `requestContext`
 * (`llmModelId` / `llmApiKey` / `llmProviderKind`). Agents resolve them
 * with `byoModelFromRequestContext` as `{ id, apiKey }`.
 *
 * Never put `apiKey` on `model` — HTTP body validation rejects the object.
 */
export function agentGenerateBody(input: {
  messages: unknown;
  llm: RuntimeLlmConfig;
  /** Extra requestContext keys (e.g. userId). */
  requestContext?: Record<string, unknown>;
  modelSettings?: Record<string, unknown>;
  maxSteps?: number;
  memory?: Record<string, unknown>;
  /** Extra top-level fields (e.g. chat `trigger`). */
  extras?: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    messages: input.messages,
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
