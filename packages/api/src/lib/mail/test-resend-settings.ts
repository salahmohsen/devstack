import { type TestMailSettingsOutput } from "@tsu-stack/core";
import { userMailSettingsRepository } from "@tsu-stack/db";

import { openSecret } from "#@/lib/settings/seal-secret";

const RESEND_DOMAINS_URL = "https://api.resend.com/domains";
const PROBE_TIMEOUT_MS = 12_000;

function webhookSecretStatus(secret: string | null): TestMailSettingsOutput["webhookSecret"] {
  if (!secret?.trim()) return "missing";
  return secret.trim().startsWith("whsec_") ? "present" : "invalid_format";
}

async function probeResendApiKey(apiKey: string): Promise<"valid" | "invalid"> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const response = await fetch(RESEND_DOMAINS_URL, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal
    });
    return response.ok || response.status === 429 ? "valid" : "invalid";
  } catch {
    throw new Error("Could not reach Resend. Check the network and try again.");
  } finally {
    clearTimeout(timer);
  }
}

export async function testResendSettings(input: {
  userId: string;
  resendApiKey?: string;
}): Promise<TestMailSettingsOutput> {
  const row = await userMailSettingsRepository.findByUserId(input.userId);
  const typedKey = input.resendApiKey?.trim() ?? "";
  const apiKey = typedKey || openSecret(row?.resendApiKeyCiphertext);
  const webhookSecret = openSecret(row?.webhookSecretCiphertext);
  const webhook = webhookSecretStatus(webhookSecret);

  if (!apiKey) {
    return {
      ok: false,
      apiKey: "missing",
      webhookSecret: webhook,
      message:
        webhook === "missing"
          ? "Save a Resend API key, then copy the webhook URL into Resend and paste the signing secret."
          : "Save a Resend API key to finish setup."
    };
  }

  const apiStatus = await probeResendApiKey(apiKey);
  if (apiStatus === "invalid") {
    return {
      ok: false,
      apiKey: "invalid",
      webhookSecret: webhook,
      message: "Resend rejected this API key. Check the key and try again."
    };
  }

  if (webhook === "missing") {
    return {
      ok: false,
      apiKey: "valid",
      webhookSecret: "missing",
      message: "API key works. Copy the webhook URL into Resend, then paste the signing secret."
    };
  }

  if (webhook === "invalid_format") {
    return {
      ok: false,
      apiKey: "valid",
      webhookSecret: "invalid_format",
      message: "API key works. The signing secret should start with whsec_ — paste it from Resend."
    };
  }

  return {
    ok: true,
    apiKey: "valid",
    webhookSecret: "present",
    message: "Resend API key is valid and the signing secret is saved."
  };
}
