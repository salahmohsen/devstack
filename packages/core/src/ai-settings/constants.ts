import { getMastraProvider, MASTRA_PROVIDER_CATALOG } from "./mastra-provider-catalog";
import { type AiFeature, type AiFeatureRequirement, type AiProviderKind } from "./types";

/** Product AI features that may bind a model id. */
export const AI_FEATURES = [
  "classify",
  "reply",
  "resumeImport",
  "stacks",
  "hubChat",
  "scorer",
  "applyPackage"
] as const satisfies readonly AiFeature[];

export const AI_FEATURE_LABELS: Record<AiFeature, string> = {
  classify: "Mail classify",
  reply: "Mail reply",
  resumeImport: "Resume import",
  stacks: "Skills",
  hubChat: "Hub chat",
  scorer: "Scorers",
  applyPackage: "Apply package"
};

/**
 * Capability each AI feature requires from its bound model (null = none).
 * Drives feature-aware "may not work" markers in Settings → Models.
 */
export const AI_FEATURE_REQUIREMENTS: Record<AiFeature, AiFeatureRequirement | null> = {
  classify: "structuredOutput",
  reply: null,
  resumeImport: "structuredOutput",
  stacks: "structuredOutput",
  hubChat: "tools",
  scorer: "structuredOutput",
  applyPackage: "structuredOutput"
};

/**
 * Featured providers shown first in AI settings (still full catalog available).
 * Aligned with common Mastra router providers + current agent defaults (deepseek).
 */
export const AI_PROVIDER_FEATURED = [
  "openai",
  "anthropic",
  "google",
  "deepseek",
  "xai",
  "groq",
  "mistral",
  "openrouter",
  "opencode",
  "togetherai",
  "fireworks-ai",
  "cerebras",
  "deepinfra",
  "huggingface",
  "perplexity",
  "nvidia",
  "vercel",
  "github-models",
  "ollama-cloud",
  "lmstudio",
  "moonshotai",
  "minimax",
  "zai",
  "alibaba",
  "novita-ai",
  "custom"
] as const satisfies readonly string[];

/** @deprecated Prefer {@link AI_PROVIDER_FEATURED} + full Mastra catalog. */
export const AI_PROVIDER_KINDS = AI_PROVIDER_FEATURED;

/** All Mastra provider ids + custom for selects. */
export const AI_PROVIDER_OPTIONS = [...MASTRA_PROVIDER_CATALOG.map((p) => p.id), "custom"] as const;

export function aiProviderLabel(kind: string): string {
  if (kind === "custom") return "Custom";
  if (kind === "chatgpt-plan") return "ChatGPT plan";
  return getMastraProvider(kind)?.name ?? kind;
}

/** Labels for featured providers (full catalog uses {@link aiProviderLabel}). */
export const AI_PROVIDER_LABELS: Record<string, string> = Object.fromEntries(
  AI_PROVIDER_OPTIONS.map((id) => [id, aiProviderLabel(id)])
);

/**
 * Default models — match apps/agent model-config (Mastra `provider/model` format).
 */
export const DEFAULT_AI_MODELS: Record<AiFeature, string> = {
  classify: "deepseek/deepseek-flash",
  reply: "deepseek/deepseek-flash",
  resumeImport: "deepseek/deepseek-flash",
  stacks: "deepseek/deepseek-flash",
  hubChat: "deepseek/deepseek-flash",
  scorer: "deepseek/deepseek-flash",
  applyPackage: "deepseek/deepseek-flash"
};

export const DEFAULT_PROVIDER_KIND: AiProviderKind = "deepseek";
