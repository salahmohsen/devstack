import {
  llmRequestContextFields,
  pickProbeModelId,
  type TestAiProviderInput,
  type TestAiProviderOutput
} from "@tsu-stack/core";
import { userAiSettingsRepository } from "@tsu-stack/db";

import { type OrpcContextAgentWorker } from "#@/lib/context/types";
import { openSecret } from "#@/lib/settings/seal-secret";

const PROVIDER_PING_AGENT_ID = "provider-ping";
const PROBE_TIMEOUT_MS = 30_000;

export type TestAiProviderDeps = {
  userId: string;
  agentWorker: OrpcContextAgentWorker | null | undefined;
  input: TestAiProviderInput;
};

function redactSecrets(text: string, apiKey: string): string {
  let out = text;
  if (apiKey.length >= 8) {
    out = out.split(apiKey).join("[redacted]");
  }
  // Common key shapes if they leaked into error payloads
  out = out.replace(/\bsk-[a-zA-Z0-9_-]{10,}\b/g, "[redacted]");
  out = out.replace(/\bBearer\s+[^\s"']+/gi, "Bearer [redacted]");
  return out;
}

function summarizeProviderError(raw: string, apiKey: string): string {
  const text = redactSecrets(raw, apiKey).replace(/\s+/g, " ").trim();
  const lower = text.toLowerCase();

  if (
    /insufficient[_\s-]?balance|billing|payment required|quota|credit/i.test(lower) ||
    /402\b/.test(lower)
  ) {
    return "Key is accepted but the account has no balance or quota. Check billing with the provider.";
  }
  if (
    /invalid[_\s-]?api[_\s-]?key|incorrect api key|unauthorized|authentication|forbidden|401|403/i.test(
      lower
    )
  ) {
    return "API key was rejected by the provider. Check the key and provider selection.";
  }
  if (/model[_\s-]?not[_\s-]?found|does not exist|unknown model|404/i.test(lower)) {
    return "Key may be valid, but the probe model is unavailable. Set a model for this provider and try again.";
  }
  if (/rate[_\s-]?limit|429|too many requests/i.test(lower)) {
    return "Provider rate-limited the probe. Wait a moment and try again.";
  }
  if (/timeout|aborted|econnrefused|enotfound|network/i.test(lower)) {
    return "Could not reach the provider (network or timeout). Try again.";
  }

  const clipped = text.slice(0, 220);
  return clipped.length > 0 ? clipped : "Provider request failed.";
}

async function resolveApiKey(
  userId: string,
  input: TestAiProviderInput
): Promise<{ apiKey: string } | { error: string }> {
  const draft = input.apiKey?.trim();
  if (draft) return { apiKey: draft };

  const providerId = input.providerId?.trim();
  if (!providerId) {
    return { error: "Enter an API key or save the provider first." };
  }

  const row = await userAiSettingsRepository.findByUserId(userId);
  const stored = row?.providers.find((p) => p.id === providerId);
  if (!stored) {
    return { error: "Saved provider not found. Save settings, then test again." };
  }
  if (stored.kind !== input.kind) {
    return { error: "Provider kind no longer matches the saved row. Save settings, then test." };
  }

  const apiKey = openSecret(stored.apiKeyCiphertext);
  if (!apiKey) {
    return { error: "Could not decrypt the saved API key. Re-enter the key and save." };
  }
  return { apiKey };
}

/**
 * Cheap live probe: one generate call through the Mastra model router with BYO key.
 * Returns a structured ok/fail payload (not thrown) so the UI can show toast copy.
 */
export async function testAiProviderConnection(
  deps: TestAiProviderDeps
): Promise<TestAiProviderOutput> {
  const started = Date.now();
  const { userId, agentWorker, input } = deps;

  if (!agentWorker) {
    return {
      ok: false,
      modelId: null,
      latencyMs: Date.now() - started,
      message: "AI worker is not configured. Set AGENT_WORKER_URL and try again."
    };
  }

  const keyResult = await resolveApiKey(userId, input);
  if ("error" in keyResult) {
    return {
      ok: false,
      modelId: null,
      latencyMs: Date.now() - started,
      message: keyResult.error
    };
  }
  const { apiKey } = keyResult;

  const row = await userAiSettingsRepository.findByUserId(userId);
  const modelId = pickProbeModelId(input.kind, {
    modelId: input.modelId,
    models: row?.models ?? null
  });

  if (!modelId) {
    return {
      ok: false,
      modelId: null,
      latencyMs: Date.now() - started,
      message:
        input.kind === "custom"
          ? "Custom providers need a full model id (provider/model) to test."
          : "No probe model available for this provider. Pick a model under Models, then try again."
    };
  }

  const llm = {
    modelId,
    providerKind: input.kind,
    apiKey
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  try {
    const response = await agentWorker.fetch(`/agents/${PROVIDER_PING_AGENT_ID}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        messages: [{ role: "user", content: "ping" }],
        model: { id: modelId, apiKey },
        modelSettings: { maxTokens: 16, temperature: 0 },
        requestContext: {
          userId,
          ...llmRequestContextFields(llm)
        }
      })
    });

    const latencyMs = Date.now() - started;
    const bodyText = await response.text().catch(() => "");

    if (!response.ok) {
      return {
        ok: false,
        modelId,
        latencyMs,
        message: summarizeProviderError(
          bodyText || `Provider returned HTTP ${response.status}`,
          apiKey
        )
      };
    }

    // Success if HTTP ok — content is optional (some providers return empty on tiny caps).
    return {
      ok: true,
      modelId,
      latencyMs,
      message: `Connected with ${modelId} (${latencyMs}ms)`
    };
  } catch (error) {
    const latencyMs = Date.now() - started;
    const raw =
      error instanceof Error
        ? error.name === "AbortError"
          ? "timeout"
          : error.message
        : String(error);
    return {
      ok: false,
      modelId,
      latencyMs,
      message: summarizeProviderError(raw, apiKey)
    };
  } finally {
    clearTimeout(timer);
  }
}
