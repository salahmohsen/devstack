import { type MailSettingsOutput } from "./types";

/** Placeholder until API fills absolute webhook URL + token. */
export function defaultMailSettingsOutput(
  webhookUrl: string,
  webhookToken: string
): MailSettingsOutput {
  return {
    inboundEnabled: false,
    inboundAddress: null,
    hasResendApiKey: false,
    resendApiKeyLast4: null,
    hasWebhookSecret: false,
    webhookSecretLast4: null,
    webhookToken,
    webhookUrl,
    updatedAt: null
  };
}

export function maskSecretLast4(secret: string): string {
  const trimmed = secret.trim();
  if (trimmed.length < 4) return trimmed;
  return trimmed.slice(-4);
}

/** Build absolute Resend inbound webhook URL for a tenant token. */
export function buildResendWebhookUrl(serverBaseUrl: string, webhookToken: string): string {
  const base = serverBaseUrl.replace(/\/+$/, "");
  return `${base}/webhooks/resend/${webhookToken}`;
}

/** Parse `Name <email@x.com>` or bare address. */
export function parseEmailAddress(raw: string): { name: string; email: string } {
  const trimmed = raw.trim();
  const angle = trimmed.match(/^(.*?)\s*<([^>]+)>$/);
  if (angle) {
    const name = (angle[1] ?? "").replace(/^["']|["']$/g, "").trim();
    const email = (angle[2] ?? "").trim().toLowerCase();
    return { name, email };
  }
  return { name: "", email: trimmed.toLowerCase() };
}

export type MailSetupStatus =
  | "ready"
  | "paused"
  | "need_api_key"
  | "need_webhook_secret"
  | "need_secrets";

/** Card badge: both secrets required before inbound can turn on. */
export function mailSetupStatus(input: {
  hasResendApiKey: boolean;
  hasWebhookSecret: boolean;
  inboundEnabled: boolean;
}): MailSetupStatus {
  if (input.hasResendApiKey && input.hasWebhookSecret) {
    return input.inboundEnabled ? "ready" : "paused";
  }
  if (input.hasResendApiKey) return "need_webhook_secret";
  if (input.hasWebhookSecret) return "need_api_key";
  return "need_secrets";
}

export function mailPreviewFromBody(bodyText: string, maxLen = 160): string {
  const collapsed = bodyText.replace(/\s+/g, " ").trim();
  if (collapsed.length <= maxLen) return collapsed;
  return `${collapsed.slice(0, maxLen - 1)}…`;
}
