import {
  LLM_REQUEST_CONTEXT_KEYS,
  providerKindFromModelId,
  type RuntimeLlmConfig
} from "@tsu-stack/core";

/**
 * Mastra OpenAI-compatible model config for per-call override.
 * @see https://mastra.ai — model: { id: "provider/model", apiKey }
 */
export type GenerateModelOverride = {
  id: `${string}/${string}`;
  apiKey: string;
};

export type ResolvedGenerateModel =
  | {
      ok: true;
      model: GenerateModelOverride;
      source: "byo";
    }
  | {
      ok: false;
      note: string;
    };

/**
 * Product LLM auth is Settings BYO only — no process.env provider keys.
 */
export function resolveGenerateModel(llm: RuntimeLlmConfig | undefined): ResolvedGenerateModel {
  const apiKey = llm?.apiKey?.trim();
  const modelId = llm?.modelId?.trim();

  if (!modelId || !modelId.includes("/")) {
    return { ok: false, note: "llm:missing_or_invalid_model_id" };
  }

  if (!apiKey) {
    const kind = llm?.providerKind ?? providerKindFromModelId(modelId) ?? "provider";
    return { ok: false, note: `llm:missing_byo_api_key_for_${kind}` };
  }

  return {
    ok: true,
    model: { id: modelId as `${string}/${string}`, apiKey },
    source: "byo"
  };
}

export function runtimeLlmFromRequestContext(
  get: (key: string) => unknown
): RuntimeLlmConfig | undefined {
  const modelId = get(LLM_REQUEST_CONTEXT_KEYS.modelId);
  const apiKey = get(LLM_REQUEST_CONTEXT_KEYS.apiKey);
  const providerKind = get(LLM_REQUEST_CONTEXT_KEYS.providerKind);
  if (typeof modelId !== "string" || modelId.length === 0) return undefined;
  return {
    modelId,
    providerKind:
      typeof providerKind === "string" && providerKind.length > 0
        ? providerKind
        : (providerKindFromModelId(modelId) ?? "unknown"),
    ...(typeof apiKey === "string" && apiKey.length > 0 ? { apiKey } : {})
  };
}

/**
 * Dynamic Agent `model` callback: BYO credentials from requestContext.
 * Used when agents run via HTTP generate/stream (hub supervisor, etc.).
 * Workflow steps should prefer `generateModelOption` + per-call `model`.
 */
export function byoModelFromRequestContext({
  requestContext
}: {
  requestContext?: { get: (key: string) => unknown };
}): GenerateModelOverride {
  const llm = requestContext
    ? runtimeLlmFromRequestContext((key) => requestContext.get(key))
    : undefined;
  const resolved = resolveGenerateModel(llm);
  if (!resolved.ok) {
    throw new Error(
      `BYO AI required: ${resolved.note}. Configure Settings → AI provider key + model.`
    );
  }
  return resolved.model;
}

/** Build `agent.generate(..., { model })` from workflow `input.llm`. */
export function generateModelOption(llm: RuntimeLlmConfig | undefined): {
  model?: GenerateModelOverride;
  skipNote?: string;
} {
  const resolved = resolveGenerateModel(llm);
  if (!resolved.ok) return { skipNote: resolved.note };
  return { model: resolved.model };
}
