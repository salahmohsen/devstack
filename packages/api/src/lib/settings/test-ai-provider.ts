import { createHash } from "node:crypto";

import {
  CHATGPT_PLAN_PROVIDER_KIND,
  ChatgptPlanError,
  pickProbeModelId,
  type TestAiProviderInput,
  type TestAiProviderOutput
} from "@tsu-stack/core";
import { userAiSettingsRepository } from "@tsu-stack/db";

import { agentGenerateBody } from "#@/lib/agent/agent-generate-body";
import { type OrpcContextAgentWorker } from "#@/lib/context/types";
import { getChatgptPlanAccessToken } from "#@/lib/settings/chatgpt-plan";
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

function summarizeProviderError(raw: string, apiKey: string, modelId?: string | null): string {
  const text = redactSecrets(raw, apiKey).replace(/\s+/g, " ").trim();
  const lower = text.toLowerCase();
  const modelHint = modelId?.trim() ? ` (${modelId.trim()})` : "";

  if (
    /insufficient[_\s-]?balance|billing|payment required|quota|credit/i.test(lower) ||
    /402\b/.test(lower)
  ) {
    return "Key is accepted but the account has no balance or quota. Check billing with the provider.";
  }
  // Client-allowlist relays (e.g. AgentRouter) reject generic API access before
  // the key is even evaluated — "unauthorized client detected" is not a key error.
  if (/unauthorized[_\s-]?client/i.test(lower)) {
    return "Provider only accepts its official coding-agent clients (e.g. Claude Code, Roo Code) and blocks generic API access. This key cannot be used as a BYO provider here.";
  }
  if (
    /invalid[_\s-]?api[_\s-]?key|incorrect api key|unauthorized|authentication|forbidden|401|403/i.test(
      lower
    ) &&
    !/model/i.test(lower)
  ) {
    return "API key was rejected by the provider. Check the key and provider selection.";
  }
  // Avoid matching bare HTML "404 Not Found" from a wrong agent route as "model unavailable".
  if (
    /model[_\s-]?not[_\s-]?found|unknown model|does not exist.*model|invalid model|model_not_found/i.test(
      lower
    )
  ) {
    return `This model is unavailable${modelHint}. Pick another model or check the provider docs.`;
  }
  if (/rate[_\s-]?limit|429|too many requests/i.test(lower)) {
    return "Provider rate-limited the probe. Wait a moment and try again.";
  }
  if (/timeout|aborted|econnrefused|enotfound|network/i.test(lower)) {
    return "Could not reach the provider (network or timeout). Try again.";
  }
  if (/agent worker|agent_worker|not configured|econnrefused/i.test(lower)) {
    return "AI worker is unreachable. Ensure the agent is running and AGENT_WORKER_URL is set.";
  }

  const clipped = text.slice(0, 220);
  return clipped.length > 0 ? clipped : "Provider request failed.";
}

/** Known OpenCode gateways that accept OpenAI chat completions with bare model ids. */
const OPENCODE_CHAT_URL: Readonly<Record<string, string>> = {
  "opencode-go": "https://opencode.ai/zen/go/v1/chat/completions",
  opencode: "https://opencode.ai/zen/v1/chat/completions"
};

/**
 * Direct gateway ping (bypasses Mastra agent). Used when agent probe fails so
 * we still validate key+model against the real OpenCode endpoint.
 */
async function directOpenCodeChatProbe(args: {
  kind: string;
  modelId: string;
  apiKey: string;
  signal: AbortSignal;
}): Promise<{ ok: true } | { ok: false; detail: string }> {
  const url = OPENCODE_CHAT_URL[args.kind];
  if (!url) return { ok: false, detail: "no direct probe url" };

  // Gateway expects bare model segment (gpt-5.6-luna), not opencode-go/gpt-5.6-luna.
  const slash = args.modelId.indexOf("/");
  const bare =
    slash > 0 && args.modelId.slice(0, slash) === args.kind
      ? args.modelId.slice(slash + 1)
      : args.modelId;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "tsu-stack-agent/1.0",
        "x-opencode-session": createHash("sha256").update(args.apiKey).digest("hex").slice(0, 32)
      },
      signal: args.signal,
      body: JSON.stringify({
        model: bare,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 16
      })
    });
    const bodyText = await response.text().catch(() => "");
    if (!response.ok) {
      return {
        ok: false,
        detail: bodyText || `HTTP ${response.status}`
      };
    }
    return { ok: true };
  } catch (error) {
    const msg =
      error instanceof Error
        ? error.name === "AbortError"
          ? "timeout"
          : error.message
        : String(error);
    return { ok: false, detail: msg };
  }
}

async function resolveApiKey(
  userId: string,
  input: TestAiProviderInput
): Promise<{ apiKey: string } | { error: string }> {
  if (input.kind === CHATGPT_PLAN_PROVIDER_KIND) {
    try {
      return { apiKey: await getChatgptPlanAccessToken(userId) };
    } catch (error) {
      return {
        error:
          error instanceof ChatgptPlanError
            ? error.message.replace(/^\[[A-Z_]+\]\s*/, "")
            : "Could not reach ChatGPT."
      };
    }
  }

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
    apiKey,
    ...(input.kind === CHATGPT_PLAN_PROVIDER_KIND ? { planUserId: userId } : {})
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  try {
    const response = await agentWorker.fetch(`/api/agents/${PROVIDER_PING_AGENT_ID}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify(
        agentGenerateBody({
          messages: [{ role: "user", content: "ping" }],
          llm,
          // Prefer maxOutputTokens (AI SDK / newer OpenAI-compatible models).
          modelSettings: { maxOutputTokens: 32, temperature: 0 },
          requestContext: { userId }
        })
      )
    });

    const latencyMs = Date.now() - started;
    const bodyText = await response.text().catch(() => "");

    if (response.ok) {
      return {
        ok: true,
        modelId,
        latencyMs,
        message: `Connected with ${modelId} (${latencyMs}ms)`
      };
    }

    // Agent/Mastra path failed — try direct OpenCode chat for known gateways so we still
    // validate key+model (e.g. gpt-5.6-luna works on chat/completions even when agent routing fails).
    if (OPENCODE_CHAT_URL[input.kind]) {
      const direct = await directOpenCodeChatProbe({
        kind: input.kind,
        modelId,
        apiKey,
        signal: controller.signal
      });
      const directLatency = Date.now() - started;
      if (direct.ok) {
        return {
          ok: true,
          modelId,
          latencyMs: directLatency,
          message: `Connected with ${modelId} (${directLatency}ms)`
        };
      }
      return {
        ok: false,
        modelId,
        latencyMs: directLatency,
        message: summarizeProviderError(direct.detail, apiKey, modelId)
      };
    }

    return {
      ok: false,
      modelId,
      latencyMs,
      message: summarizeProviderError(
        bodyText || `Provider returned HTTP ${response.status}`,
        apiKey,
        modelId
      )
    };
  } catch (error) {
    const latencyMs = Date.now() - started;
    const raw =
      error instanceof Error
        ? error.name === "AbortError"
          ? "timeout"
          : error.message
        : String(error);

    if (OPENCODE_CHAT_URL[input.kind] && raw !== "timeout") {
      const fallbackController = new AbortController();
      const fallbackTimer = setTimeout(() => fallbackController.abort(), PROBE_TIMEOUT_MS);
      try {
        const direct = await directOpenCodeChatProbe({
          kind: input.kind,
          modelId,
          apiKey,
          signal: fallbackController.signal
        });
        const directLatency = Date.now() - started;
        if (direct.ok) {
          return {
            ok: true,
            modelId,
            latencyMs: directLatency,
            message: `Connected with ${modelId} (${directLatency}ms)`
          };
        }
        return {
          ok: false,
          modelId,
          latencyMs: directLatency,
          message: summarizeProviderError(direct.detail, apiKey, modelId)
        };
      } finally {
        clearTimeout(fallbackTimer);
      }
    }

    return {
      ok: false,
      modelId,
      latencyMs,
      message: summarizeProviderError(raw, apiKey, modelId)
    };
  } finally {
    clearTimeout(timer);
  }
}
