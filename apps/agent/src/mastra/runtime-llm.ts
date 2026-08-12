import { RequestContext } from "@mastra/core/di";

import {
  LLM_REQUEST_CONTEXT_KEYS,
  providerKindFromModelId,
  type RuntimeLlmConfig
} from "@tsu-stack/core";

/**
 * Mastra OpenAI-compatible model config for in-process `agent.generate({ model })`.
 * HTTP `/api/agents/:id/generate` body must NOT use this shape — that schema expects
 * `model` as an optional string id; BYO keys go on requestContext only.
 */
export type GenerateModelOverride = {
  id: `${string}/${string}`;
  apiKey: string;
};

/**
 * Agents use `model: byoModelFromRequestContext`. Per-call `generate({ model })`
 * is not always enough — skills/tool steps re-enter the agent model callback.
 * Always stamp BYO credentials onto requestContext before generate.
 */
export function applyLlmToRequestContext(
  requestContext: RequestContext,
  llm: RuntimeLlmConfig | undefined
): void {
  if (!llm?.modelId?.trim()) return;
  requestContext.set(LLM_REQUEST_CONTEXT_KEYS.modelId, llm.modelId);
  requestContext.set(LLM_REQUEST_CONTEXT_KEYS.providerKind, llm.providerKind);
  if (llm.apiKey?.trim()) {
    requestContext.set(LLM_REQUEST_CONTEXT_KEYS.apiKey, llm.apiKey);
  }
}

/** Fresh RequestContext with optional userId + BYO LLM keys. */
export function createByoRequestContext(
  llm: RuntimeLlmConfig | undefined,
  extras?: { userId?: string }
): RequestContext {
  const requestContext = new RequestContext();
  if (extras?.userId) requestContext.set("userId", extras.userId);
  applyLlmToRequestContext(requestContext, llm);
  return requestContext;
}

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
