import { createHash } from "node:crypto";

import {
  getMastraProvider,
  toMastraModelId,
  type ListProviderModelsInput,
  type ListProviderModelsOutput
} from "@tsu-stack/core";
import { userAiSettingsRepository } from "@tsu-stack/db";

import { openSecret } from "#@/lib/settings/seal-secret";

const CACHE_TTL_MS = 20 * 60 * 1000;
const FETCH_TIMEOUT_MS = 15_000;

/** Known public OpenAI-compatible models endpoints (no invented base URLs). */
const LIVE_MODELS_URL: Readonly<Record<string, string>> = {
  "opencode-go": "https://opencode.ai/zen/go/v1/models",
  opencode: "https://opencode.ai/zen/v1/models"
};

type CacheEntry = {
  expiresAt: number;
  value: ListProviderModelsOutput;
};

/** In-process list cache — key never includes the raw API key. */
const modelsCache = new Map<string, CacheEntry>();

export type ListProviderModelsDeps = {
  userId: string;
  input: ListProviderModelsInput;
};

function keyFingerprint(apiKey: string): string {
  const last4 = apiKey.length >= 4 ? apiKey.slice(-4) : apiKey;
  return createHash("sha256").update(last4).digest("hex").slice(0, 16);
}

function cacheKey(args: {
  userId: string;
  kind: string;
  providerId: string | null;
  apiKey: string;
}): string {
  return `${args.userId}|${args.kind}|${args.providerId ?? "-"}|${keyFingerprint(args.apiKey)}`;
}

async function resolveApiKey(
  userId: string,
  input: ListProviderModelsInput
): Promise<
  { apiKey: string; providerId: string | null } | { error: string; providerId: string | null }
> {
  const providerId = input.providerId?.trim() ?? null;
  const draft = input.apiKey?.trim();
  if (draft) return { apiKey: draft, providerId };

  if (!providerId) {
    return { error: "Enter an API key or save the provider first.", providerId: null };
  }

  const row = await userAiSettingsRepository.findByUserId(userId);
  const stored = row?.providers.find((p) => p.id === providerId);
  if (!stored) {
    return {
      error: "Saved provider not found. Save settings, then list models again.",
      providerId
    };
  }
  if (stored.kind !== input.kind) {
    return {
      error: "Provider kind no longer matches the saved row. Save settings, then try again.",
      providerId
    };
  }

  const apiKey = openSecret(stored.apiKeyCiphertext);
  if (!apiKey) {
    return {
      error: "Could not decrypt the saved API key. Re-enter the key and save.",
      providerId
    };
  }
  return { apiKey, providerId };
}

function catalogModels(kind: string): Array<{ id: string; label: string }> {
  if (kind === "custom") return [];
  const entry = getMastraProvider(kind);
  if (!entry?.models?.length) return [];
  return entry.models.map((name) => {
    const label = name.includes("/") ? name.slice(name.indexOf("/") + 1) : name;
    return { id: toMastraModelId(kind, name), label };
  });
}

function parseOpenAiModelsList(json: unknown, kind: string): Array<{ id: string; label: string }> {
  if (!json || typeof json !== "object") return [];
  const data = (json as { data?: unknown }).data;
  if (!Array.isArray(data)) return [];

  const models: Array<{ id: string; label: string }> = [];
  const seen = new Set<string>();

  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const rawId = (item as { id?: unknown }).id;
    if (typeof rawId !== "string" || !rawId.trim()) continue;

    // API may return bare ids (`gpt-5.6-luna`) or already-prefixed; normalize to Mastra id.
    const bare = rawId.includes("/") ? rawId.slice(rawId.lastIndexOf("/") + 1) : rawId.trim();
    if (!bare) continue;
    const id = toMastraModelId(kind, bare);
    if (seen.has(id)) continue;
    seen.add(id);
    models.push({ id, label: bare });
  }

  return models;
}

/**
 * Live fetch for kinds with a known models URL. Returns null on miss/error
 * (caller falls back to catalog). Never logs apiKey.
 */
async function fetchLiveModels(
  kind: string,
  apiKey: string
): Promise<Array<{ id: string; label: string }> | null> {
  const url = LIVE_MODELS_URL[kind];
  if (!url) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        // Some CDNs treat non-browser UAs more permissively for this public list.
        "User-Agent": "curl/8.7.1"
      },
      signal: controller.signal
    });

    if (!response.ok) return null;

    const json: unknown = await response.json().catch(() => null);
    const models = parseOpenAiModelsList(json, kind);
    return models.length > 0 ? models : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function withProviderId(
  value: Omit<ListProviderModelsOutput, "providerId"> & { providerId?: string | null },
  providerId: string | null
): ListProviderModelsOutput {
  return { ...value, providerId };
}

/**
 * List models for a provider kind using the user's draft or sealed key.
 *
 * - Prefer live OpenAI-compatible `/v1/models` when a known URL exists (OpenCode Go/Zen).
 * - Otherwise (or on failure): catalog `entry.models` → `toMastraModelId`.
 * - Never uses operator env provider keys. Never logs apiKey.
 */
export async function listProviderModels(
  deps: ListProviderModelsDeps
): Promise<ListProviderModelsOutput> {
  const { userId, input } = deps;
  const kind = input.kind;

  const keyResult = await resolveApiKey(userId, input);
  const providerId = "providerId" in keyResult ? keyResult.providerId : null;

  if ("error" in keyResult) {
    const models = catalogModels(kind);
    return withProviderId(
      {
        models,
        source: models.length > 0 ? "fallback" : "empty",
        errorMessage: keyResult.error
      },
      providerId
    );
  }

  const { apiKey } = keyResult;
  const ck = cacheKey({ userId, kind, providerId, apiKey });
  const cached = modelsCache.get(ck);
  if (cached && cached.expiresAt > Date.now()) {
    return withProviderId(cached.value, providerId);
  }

  const live = await fetchLiveModels(kind, apiKey);
  if (live) {
    const value = withProviderId({ models: live, source: "live" }, providerId);
    // Only cache successful live lists for the full TTL.
    modelsCache.set(ck, { expiresAt: Date.now() + CACHE_TTL_MS, value });
    return value;
  }

  const models = catalogModels(kind);
  const hadLiveEndpoint = Boolean(LIVE_MODELS_URL[kind]);
  const value = withProviderId(
    {
      models,
      source: models.length > 0 ? "fallback" : "empty",
      ...(models.length === 0
        ? {
            errorMessage:
              kind === "custom"
                ? "Custom providers need a full model id (provider/model)."
                : "No models available for this provider."
          }
        : hadLiveEndpoint
          ? { errorMessage: "Live model list unavailable; showing catalog fallback." }
          : {})
    },
    providerId
  );
  // Do not cache fallback after a failed live fetch — allow retry on next open.
  // Cache pure catalog-only kinds (no live endpoint) briefly to avoid hammering.
  if (!hadLiveEndpoint) {
    modelsCache.set(ck, { expiresAt: Date.now() + CACHE_TTL_MS, value });
  }
  return value;
}
