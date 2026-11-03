import { AI_FEATURES, DEFAULT_AI_MODELS } from "./constants";
import { getMastraProvider, modelCapabilityFor, toMastraModelId } from "./mastra-provider-catalog";
import { providerKindFromModelId } from "./runtime-llm";
import { type AiFeature, type AiModelsMap, type AiSettingsOutput } from "./types";

export type FeatureBindings = Partial<Record<AiFeature, string | undefined>>;

export function defaultAiModels(): AiModelsMap {
  return { ...DEFAULT_AI_MODELS };
}

/**
 * Pick a cheap probe model for a provider kind.
 * Prefer an explicit override, then a user model bound to that kind, then catalog first model.
 */
export function pickProbeModelId(
  kind: string,
  options?: {
    modelId?: string | null;
    models?: Partial<AiModelsMap> | null;
  }
): string | null {
  const override = options?.modelId?.trim();
  if (override) return override;

  const models = options?.models;
  if (models) {
    for (const feature of AI_FEATURES) {
      const id = models[feature]?.trim();
      if (id?.startsWith(`${kind}/`)) return id;
    }
  }

  if (kind === "custom") return null;

  const entry = getMastraProvider(kind);
  const best = bestProbeModel(kind, entry?.models ?? []);
  if (!best) return null;
  return toMastraModelId(kind, best);
}

/** Non-chat models (image/embedding/audio/moderation) can never answer a ping. */
const NON_CHAT_MODEL =
  /image|embed|tts|whisper|flux|rerank|guard|safety|moderat|video|audio|transcri|speech|ocr|vision-exp|diffusion|sdxl/i;
/** Cheap/fast chat models — a probe should not burn a flagship call. */
const CHEAP_MODEL = /flash|mini|lite|small|nano|haiku|instant|lightning|tiny/i;
/**
 * Free-tier slugs rotate and are rate-limited per key; a stale or exhausted free
 * model would make a healthy key look broken, so paid models are probed first.
 */
const FREE_MODEL = /(^|[-:/])free($|[-:])|:free$|-free$/i;
/** Alias/router slugs resolve unpredictably (openrouter `~anthropic/...-latest`). */
const ALIAS_MODEL = /^~|-latest$|^auto$|\/auto$/i;

function probeScore(kind: string, model: string): number {
  const cap = modelCapabilityFor(toMastraModelId(kind, model));
  let score = 0;
  if (NON_CHAT_MODEL.test(model)) score -= 100;
  if (FREE_MODEL.test(model)) score -= 20;
  if (ALIAS_MODEL.test(model)) score -= 10;
  if (cap.toolCall === true) score += 10;
  if (cap.structuredOutput === true) score += 3;
  if (CHEAP_MODEL.test(model)) score += 5;
  return score;
}

function bestProbeModel(kind: string, models: readonly string[]): string | null {
  let best: string | null = null;
  let bestScore = -Infinity;
  for (const model of models) {
    const score = probeScore(kind, model);
    if (score > bestScore) {
      best = model;
      bestScore = score;
    }
  }
  return best;
}

export function defaultAiSettingsOutput(): AiSettingsOutput {
  return {
    providers: [],
    models: defaultAiModels(),
    modelProviderIds: {},
    hubPersonality: "cairo",
    hubAvatar: "scarab",
    updatedAt: null
  };
}

export function mergeAiModels(
  current: AiModelsMap,
  patch: Partial<AiModelsMap> | undefined
): AiModelsMap {
  if (!patch) return current;
  return { ...current, ...patch };
}

/**
 * Effective provider-row binding for a feature.
 * Missing / blank treated as undefined (same as resolve fallback).
 */
export function effectiveBinding(
  bindings: FeatureBindings,
  feature: AiFeature
): string | undefined {
  const value = bindings[feature]?.trim();
  if (!value) return undefined;
  return value;
}

/**
 * Feature is "on Default" only when model equals `models.reply` **and**
 * effective binding matches reply's binding (both missing = match).
 * Default template is always `models.reply`.
 */
export function isFeatureOnDefault(args: {
  feature: AiFeature;
  models: AiModelsMap;
  bindings: FeatureBindings;
}): boolean {
  if (args.models[args.feature] !== args.models.reply) return false;
  return effectiveBinding(args.bindings, args.feature) === effectiveBinding(args.bindings, "reply");
}

/**
 * Cascade a Default-model change onto every feature that was on Default under the previous state.
 * `reply` always receives the new default model + binding.
 */
export function cascadeDefaultModelChange(args: {
  prevModels: AiModelsMap;
  prevBindings: FeatureBindings;
  nextDefaultModel: string;
  nextDefaultProviderId: string | undefined;
}): { models: AiModelsMap; bindings: FeatureBindings } {
  const models: AiModelsMap = { ...args.prevModels };
  const bindings: FeatureBindings = { ...args.prevBindings };

  const applyDefault = (feature: AiFeature) => {
    models[feature] = args.nextDefaultModel;
    if (args.nextDefaultProviderId) {
      bindings[feature] = args.nextDefaultProviderId;
    } else {
      delete bindings[feature];
    }
  };

  // reply is the Default template — always update
  applyDefault("reply");

  for (const feature of AI_FEATURES) {
    if (feature === "reply") continue;
    if (
      isFeatureOnDefault({
        feature,
        models: args.prevModels,
        bindings: args.prevBindings
      })
    ) {
      applyDefault(feature);
    }
  }

  return { models, bindings };
}

/** Drop bindings whose provider row id is no longer in the live set. */
export function stripDeadModelProviderIds(
  bindings: FeatureBindings,
  liveProviderIds: Set<string>
): FeatureBindings {
  const next: FeatureBindings = {};
  for (const feature of AI_FEATURES) {
    const id = bindings[feature]?.trim();
    if (id && liveProviderIds.has(id)) {
      next[feature] = id;
    }
  }
  return next;
}

/**
 * Pick the provider row for a model: preferred binding if kind matches model prefix,
 * else first provider of that kind (prefer rows that look key-ready).
 * Shared by Test UI and runtime resolve semantics.
 */
export function resolveProviderRowForModel<T extends { id: string; kind: string }>(args: {
  modelId: string;
  preferredProviderId?: string | null;
  providers: T[];
  /** Prefer providers that satisfy this (e.g. has sealed key / draft key). */
  prefer?: (p: T) => boolean;
}): T | undefined {
  const kind = providerKindFromModelId(args.modelId.trim());
  if (!kind) return undefined;

  const preferredId = args.preferredProviderId?.trim();
  const preferred = preferredId ? args.providers.find((p) => p.id === preferredId) : undefined;

  if (preferred && preferred.kind === kind) return preferred;

  if (args.prefer) {
    const preferredKind = args.providers.find((p) => p.kind === kind && args.prefer!(p));
    if (preferredKind) return preferredKind;
  }

  return args.providers.find((p) => p.kind === kind);
}

export function maskApiKeyLast4(apiKey: string): string {
  const trimmed = apiKey.trim();
  if (trimmed.length < 4) return trimmed;
  return trimmed.slice(-4);
}
