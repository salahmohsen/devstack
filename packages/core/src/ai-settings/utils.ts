import { DEFAULT_AI_MODELS, DEFAULT_MAIL_REPLY_AUTONOMY } from "./constants";
import { type AiModelsMap, type AiSettingsOutput, type MailReplyAutonomy } from "./types";

export function defaultAiModels(): AiModelsMap {
  return { ...DEFAULT_AI_MODELS };
}

export function defaultAiSettingsOutput(): AiSettingsOutput {
  return {
    providers: [],
    models: defaultAiModels(),
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

export function isMailReplyAutonomy(value: string): value is MailReplyAutonomy {
  return value === "assist" || value === "full";
}

export function maskApiKeyLast4(apiKey: string): string {
  const trimmed = apiKey.trim();
  if (trimmed.length < 4) return trimmed;
  return trimmed.slice(-4);
}
