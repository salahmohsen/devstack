import { AI_FEATURES, DEFAULT_AI_MODELS, DEFAULT_MAIL_REPLY_AUTONOMY } from "./constants";
import { getMastraProvider, toMastraModelId } from "./mastra-provider-catalog";
import {
  type AiFeature,
  type AiModelsMap,
  type AiSettingsOutput,
  type MailReplyAutonomy
} from "./types";

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
  const first = entry?.models[0];
  if (!first) return null;
  return toMastraModelId(kind, first);
}

export function defaultAiSettingsOutput(): AiSettingsOutput {
  return {
    providers: [],
    models: defaultAiModels(),
    modelProviderIds: {},
    mailReplyAutonomy: DEFAULT_MAIL_REPLY_AUTONOMY,
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

export function isMailReplyAutonomy(value: string): value is MailReplyAutonomy {
  return value === "assist" || value === "full";
}

export function maskApiKeyLast4(apiKey: string): string {
  const trimmed = apiKey.trim();
  if (trimmed.length < 4) return trimmed;
  return trimmed.slice(-4);
}
