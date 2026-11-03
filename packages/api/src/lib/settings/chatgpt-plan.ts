import { randomUUID } from "node:crypto";

import { createRemoteJWKSet, jwtVerify } from "jose";

import {
  CHATGPT_PLAN_API_BASE_URL,
  CHATGPT_PLAN_DISCOVERY_URL,
  CHATGPT_PLAN_ISSUER,
  CHATGPT_PLAN_LIMIT_PAUSE_MS,
  CHATGPT_PLAN_PENDING_TTL_MS,
  CHATGPT_PLAN_PROVIDER_KIND,
  buildAuthorizeUrl,
  callbackFailureMessage,
  chatgptPlanError,
  chatgptPlanModelId,
  createHostId,
  defaultAiModels,
  exchangeAuthorizationCode,
  getFreshAccessToken,
  hasDirectPlanScope,
  parseCallbackInput,
  pkceChallengeS256,
  planTypeFromIdToken,
  randomUrlToken,
  type ChatgptPlanCredentials,
  type ChatgptPlanErrorCode,
  type ChatgptPlanModelsOutput,
  type ChatgptPlanStatus,
  type ChatgptPlanTokenStore
} from "@tsu-stack/core";
import { userAiSettingsRepository, userChatgptPlanRepository } from "@tsu-stack/db";
import { type StoredAiModels } from "@tsu-stack/db/schema";

import { openSecret, sealSecret } from "#@/lib/settings/seal-secret";

type Discovery = {
  issuer: string;
  jwks_uri: string;
  revocation_endpoint?: string;
};

let discoveryCache: { value: Discovery; expiresAt: number } | null = null;

async function loadDiscovery(): Promise<Discovery> {
  if (discoveryCache && discoveryCache.expiresAt > Date.now()) return discoveryCache.value;
  const response = await fetch(CHATGPT_PLAN_DISCOVERY_URL, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw chatgptPlanError("CHATGPT_PLAN_UNAVAILABLE");
  const value = (await response.json()) as Discovery;
  discoveryCache = { value, expiresAt: Date.now() + 60 * 60 * 1000 };
  return value;
}

function sealCredentials(c: ChatgptPlanCredentials): string {
  return sealSecret(JSON.stringify(c));
}

function openCredentials(ciphertext: string | null): ChatgptPlanCredentials | null {
  const plain = openSecret(ciphertext);
  if (!plain) return null;
  try {
    return JSON.parse(plain) as ChatgptPlanCredentials;
  } catch {
    return null;
  }
}

const tokenStore: ChatgptPlanTokenStore = {
  async read(userId) {
    const row = await userChatgptPlanRepository.findByUserId(userId);
    if (!row || row.needsReconnect) return null;
    return openCredentials(row.credentialsCiphertext);
  },
  withUserLock(userId, fn) {
    return userChatgptPlanRepository.withCredentialsLock(userId, (ctx) =>
      fn({
        current: ctx.needsReconnect ? null : openCredentials(ctx.credentialsCiphertext),
        save: (next) =>
          ctx.save({
            credentialsCiphertext: sealCredentials(next),
            scopes: next.scopes,
            accessExpiresAt: new Date(next.accessExpiresAt)
          }),
        markNeedsReconnect: ctx.markNeedsReconnect
      })
    );
  }
};

/** Access token for agent runs. Throws a typed ChatgptPlanError the UI can act on. */
export async function getChatgptPlanAccessToken(userId: string): Promise<string> {
  const row = await userChatgptPlanRepository.findByUserId(userId);
  if (
    row?.lastErrorCode === "CHATGPT_PLAN_LIMIT" &&
    row.lastErrorAt &&
    Date.now() - row.lastErrorAt.getTime() < CHATGPT_PLAN_LIMIT_PAUSE_MS
  ) {
    throw chatgptPlanError("CHATGPT_PLAN_LIMIT");
  }
  return getFreshAccessToken({ userId, store: tokenStore, fetch });
}

export async function startChatgptPlanSignIn(userId: string) {
  const row = await userChatgptPlanRepository.ensure(userId, createHostId());
  const verifier = randomUrlToken(48);
  const state = randomUrlToken(24);
  const nonce = randomUrlToken(24);
  const expiresAt = new Date(Date.now() + CHATGPT_PLAN_PENDING_TTL_MS);

  await userChatgptPlanRepository.setPending(userId, {
    state,
    verifierCiphertext: sealSecret(verifier),
    nonce,
    expiresAt
  });

  const authorizeUrl = buildAuthorizeUrl({
    clientId: row.clientId,
    hostId: row.hostId,
    state,
    nonce,
    codeChallenge: await pkceChallengeS256(verifier)
  });
  return { authorizeUrl, expiresAt };
}

export type CompleteResult =
  | { ok: true; status: ChatgptPlanStatus }
  | { ok: false; message: string };

export async function completeChatgptPlanSignIn(
  userId: string,
  callbackUrl: string
): Promise<CompleteResult> {
  const row = await userChatgptPlanRepository.findByUserId(userId);
  if (!row?.pendingState || !row.pendingExpiresAt || row.pendingExpiresAt.getTime() < Date.now()) {
    return { ok: false, message: "This sign-in attempt expired. Start again." };
  }

  const parsed = parseCallbackInput(callbackUrl, row.pendingState);
  if (!parsed.ok) return { ok: false, message: callbackFailureMessage(parsed.reason) };

  const pending = await userChatgptPlanRepository.takePending(userId);
  if (!pending) {
    return { ok: false, message: "This sign-in attempt was already used. Start again." };
  }

  const clientId = pending.clientId ?? parsed.clientId;
  if (!clientId) return { ok: false, message: "OpenAI did not return a client id. Start again." };
  if (pending.clientId && parsed.clientId && parsed.clientId !== pending.clientId) {
    return { ok: false, message: "OpenAI returned a different client. Start again." };
  }

  const verifier = openSecret(pending.verifierCiphertext);
  if (!verifier) return { ok: false, message: "Sign-in state could not be read. Start again." };

  let credentials: ChatgptPlanCredentials;
  try {
    credentials = await exchangeAuthorizationCode({
      fetch,
      clientId,
      code: parsed.code,
      codeVerifier: verifier
    });
  } catch (error) {
    return {
      ok: false,
      message: planErrorMessage(error, "Could not finish sign-in. Start again.")
    };
  }

  if (!hasDirectPlanScope(credentials.scopes)) {
    return {
      ok: false,
      message:
        "ChatGPT sign-in worked, but plan usage was not allowed. Start again and approve plan usage."
    };
  }
  if (!credentials.idToken) {
    return { ok: false, message: "OpenAI returned no identity. Start again." };
  }

  let identity: { subject: string; email: string | null; planType: string | null };
  try {
    identity = await verifyIdToken(credentials.idToken, clientId, pending.nonce);
  } catch {
    return { ok: false, message: "Could not verify the ChatGPT identity. Start again." };
  }

  if (row.subject && row.subject !== identity.subject && row.credentialsCiphertext) {
    return {
      ok: false,
      message: "That is a different ChatGPT account. Disconnect first, then connect."
    };
  }

  await userChatgptPlanRepository.saveConnected(userId, {
    clientId,
    credentialsCiphertext: sealCredentials(credentials),
    email: identity.email,
    subject: identity.subject,
    planType: identity.planType,
    scopes: credentials.scopes,
    accessExpiresAt: new Date(credentials.accessExpiresAt)
  });
  await ensureProviderRow(userId);

  return { ok: true, status: await getChatgptPlanStatus(userId) };
}

function planErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.name === "ChatgptPlanError"
    ? error.message.replace(/^\[[A-Z_]+\]\s*/, "")
    : fallback;
}

async function verifyIdToken(idToken: string, clientId: string, nonce: string) {
  const discovery = await loadDiscovery();
  const { payload } = await jwtVerify(idToken, createRemoteJWKSet(new URL(discovery.jwks_uri)), {
    issuer: discovery.issuer ?? CHATGPT_PLAN_ISSUER,
    audience: clientId
  });
  if (payload.nonce !== nonce) throw new Error("nonce mismatch");
  if (!payload.sub) throw new Error("missing subject");
  return {
    subject: payload.sub,
    email: typeof payload.email === "string" ? payload.email : null,
    planType: planTypeFromIdToken(payload)
  };
}

async function ensureProviderRow(userId: string): Promise<void> {
  const existing = await userAiSettingsRepository.findByUserId(userId);
  const providers = existing?.providers ?? [];
  if (providers.some((p) => p.kind === CHATGPT_PLAN_PROVIDER_KIND)) return;
  await userAiSettingsRepository.upsert({
    id: existing?.id ?? randomUUID(),
    userId,
    providers: [
      ...providers,
      {
        id: randomUUID(),
        kind: CHATGPT_PLAN_PROVIDER_KIND,
        label: "ChatGPT plan",
        apiKeyLast4: null,
        apiKeyCiphertext: null
      }
    ],
    models: { ...defaultAiModels(), ...existing?.models } as StoredAiModels
  });
}

export async function listChatgptPlanModels(userId: string): Promise<ChatgptPlanModelsOutput> {
  const token = await getChatgptPlanAccessToken(userId);
  const response = await fetch(`${CHATGPT_PLAN_API_BASE_URL}/models`, {
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
    signal: AbortSignal.timeout(15_000)
  });
  if (!response.ok) {
    throw chatgptPlanError(
      response.status === 401 ? "CHATGPT_PLAN_RECONNECT" : "CHATGPT_PLAN_UNAVAILABLE"
    );
  }
  const json = (await response.json().catch(() => null)) as {
    models?: Array<{ slug?: unknown; display_name?: unknown; visibility?: unknown }>;
  } | null;
  const models: ChatgptPlanModelsOutput["models"] = [];
  for (const m of json?.models ?? []) {
    if (m.visibility !== "list" || typeof m.slug !== "string" || m.slug.length === 0) continue;
    models.push({
      id: chatgptPlanModelId(m.slug),
      label:
        typeof m.display_name === "string" && m.display_name.length > 0 ? m.display_name : m.slug
    });
  }
  return { models };
}

async function revokeRefreshToken(credentials: ChatgptPlanCredentials): Promise<boolean> {
  try {
    const discovery = await loadDiscovery();
    if (!discovery.revocation_endpoint) return false;
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await fetch(discovery.revocation_endpoint, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          token: credentials.refreshToken,
          token_type_hint: "refresh_token",
          client_id: credentials.clientId
        }).toString(),
        signal: AbortSignal.timeout(10_000)
      });
      if (response.status === 200) return true;
      if (response.status < 500) return false;
    }
  } catch {
    return false;
  }
  return false;
}

/** Revokes at OpenAI, then deletes stored tokens and unbinds plan models. `revoked` is false when OpenAI could not confirm. */
export async function disconnectChatgptPlan(userId: string): Promise<{ revoked: boolean }> {
  const row = await userChatgptPlanRepository.findByUserId(userId);
  const credentials = openCredentials(row?.credentialsCiphertext ?? null);
  const revoked = credentials ? await revokeRefreshToken(credentials) : true;

  await userChatgptPlanRepository.clearConnection(userId);

  const settings = await userAiSettingsRepository.findByUserId(userId);
  if (settings) {
    const removed = new Set(
      settings.providers.filter((p) => p.kind === CHATGPT_PLAN_PROVIDER_KIND).map((p) => p.id)
    );
    const defaults = defaultAiModels();
    const models = { ...settings.models } as Record<string, string | undefined>;
    for (const [feature, modelId] of Object.entries(models)) {
      if (modelId?.startsWith(`${CHATGPT_PLAN_PROVIDER_KIND}/`)) {
        models[feature] = defaults[feature as keyof typeof defaults];
      }
    }
    const modelProviderIds = Object.fromEntries(
      Object.entries(settings.modelProviderIds ?? {}).filter(([, id]) => !removed.has(id as string))
    );
    await userAiSettingsRepository.upsert({
      id: settings.id,
      userId,
      providers: settings.providers.filter((p) => !removed.has(p.id)),
      models: models as StoredAiModels,
      modelProviderIds
    });
  }
  return { revoked };
}

export async function getChatgptPlanStatus(userId: string): Promise<ChatgptPlanStatus> {
  const row = await userChatgptPlanRepository.findByUserId(userId);
  const connected = Boolean(row?.credentialsCiphertext) && !row?.needsReconnect;
  const limitActive =
    row?.lastErrorCode === "CHATGPT_PLAN_LIMIT" &&
    row.lastErrorAt &&
    Date.now() - row.lastErrorAt.getTime() < CHATGPT_PLAN_LIMIT_PAUSE_MS;
  return {
    connected,
    needsReconnect: Boolean(row?.needsReconnect),
    planUsageEnabled: connected && hasDirectPlanScope(row?.scopes ?? []),
    email: row?.email ?? null,
    planType: row?.planType ?? null,
    accessExpiresAt: connected ? (row?.accessExpiresAt ?? null) : null,
    lastErrorCode:
      row?.lastErrorCode && (row.lastErrorCode !== "CHATGPT_PLAN_LIMIT" || limitActive)
        ? (row.lastErrorCode as ChatgptPlanErrorCode)
        : null,
    lastErrorAt: row?.lastErrorAt ?? null
  };
}
