import { getMastraProvider, MASTRA_PROVIDER_CATALOG } from "./mastra-provider-catalog";
import { type AiFeature, type AiProviderKind, type MailReplyAutonomy } from "./types";

/** Product AI features that may bind a model id. */
export const AI_FEATURES = [
  "classify",
  "reply",
  "resumeImport",
  "stacks",
  "hubChat",
  "scorer"
] as const satisfies readonly AiFeature[];

export const AI_FEATURE_LABELS: Record<AiFeature, string> = {
  classify: "Mail classify",
  reply: "Mail reply",
  resumeImport: "Resume import",
  stacks: "Stacks",
  hubChat: "Hub chat",
  scorer: "Scorers"
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
  return getMastraProvider(kind)?.name ?? kind;
}

/** Labels for featured providers (full catalog uses {@link aiProviderLabel}). */
export const AI_PROVIDER_LABELS: Record<string, string> = Object.fromEntries(
  AI_PROVIDER_OPTIONS.map((id) => [id, aiProviderLabel(id)])
);

export const MAIL_REPLY_AUTONOMY = [
  "assist",
  "full"
] as const satisfies readonly MailReplyAutonomy[];

export const MAIL_REPLY_AUTONOMY_LABELS: Record<MailReplyAutonomy, string> = {
  assist: "Assist — draft + confirm in Review",
  full: "Full — auto-send after draft"
};

/**
 * Default models — match apps/agent model-config (Mastra `provider/model` format).
 */
export const DEFAULT_AI_MODELS: Record<AiFeature, string> = {
  classify: "deepseek/deepseek-v4-flash",
  reply: "deepseek/deepseek-v4-flash",
  resumeImport: "deepseek/deepseek-v4-flash",
  stacks: "deepseek/deepseek-v4-flash",
  hubChat: "deepseek/deepseek-v4-flash",
  scorer: "deepseek/deepseek-v4-flash"
};

export const DEFAULT_MAIL_REPLY_AUTONOMY: MailReplyAutonomy = "assist";

export const DEFAULT_PROVIDER_KIND: AiProviderKind = "deepseek";
