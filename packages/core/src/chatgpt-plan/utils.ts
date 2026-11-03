import {
  CHATGPT_PLAN_AGENT_NAME_HINT,
  CHATGPT_PLAN_AUTHORIZE_URL,
  CHATGPT_PLAN_DIRECT_SCOPE,
  CHATGPT_PLAN_DYNAMIC_CLIENT_ID,
  CHATGPT_PLAN_PROVIDER_KIND,
  CHATGPT_PLAN_REDIRECT_URI,
  CHATGPT_PLAN_RESOURCE,
  CHATGPT_PLAN_SCOPES
} from "./constants";
import { ChatgptPlanError, type ChatgptPlanErrorCode } from "./types";

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export function randomUrlToken(byteLength = 32): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

export async function pkceChallengeS256(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

export function createHostId(): string {
  return `urn:uuid:${crypto.randomUUID()}`;
}

export type AuthorizeUrlInput = {
  /** Omit for first sign-in (dynamic registration). */
  clientId?: string | null;
  hostId: string;
  state: string;
  nonce: string;
  codeChallenge: string;
  idTokenHint?: string | null;
  loginHint?: string | null;
};

export function buildAuthorizeUrl(input: AuthorizeUrlInput): string {
  const trimmedClientId = input.clientId?.trim();
  const registered = trimmedClientId && trimmedClientId.length > 0 ? trimmedClientId : undefined;
  const url = new URL(CHATGPT_PLAN_AUTHORIZE_URL);
  const p = url.searchParams;
  p.set("client_id", registered ?? CHATGPT_PLAN_DYNAMIC_CLIENT_ID);
  if (!registered) p.set("agent_name_hint", CHATGPT_PLAN_AGENT_NAME_HINT);
  p.set("ext_agent_host_id", input.hostId);
  if (input.idTokenHint) p.set("id_token_hint", input.idTokenHint);
  if (input.loginHint) p.set("login_hint", input.loginHint);
  p.set("response_type", "code");
  p.set("redirect_uri", CHATGPT_PLAN_REDIRECT_URI);
  p.set("scope", CHATGPT_PLAN_SCOPES.join(" "));
  p.set("resource", CHATGPT_PLAN_RESOURCE);
  p.set("state", input.state);
  p.set("nonce", input.nonce);
  p.set("code_challenge_method", "S256");
  p.set("code_challenge", input.codeChallenge);
  return url.toString();
}

export type CallbackFailureReason =
  | "denied"
  | "state_mismatch"
  | "missing_code"
  | "malformed"
  | "oauth_error";

export type ParsedCallback =
  | { ok: true; code: string; clientId: string | null; scope: string[] }
  | { ok: false; reason: CallbackFailureReason };

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Accepts the full redirect URL or just its query string. A bare code is rejected because state cannot be checked. */
export function parseCallbackInput(raw: string, expectedState: string): ParsedCallback {
  const text = raw.trim();
  let params: URLSearchParams;
  try {
    params = text.includes("://")
      ? new URL(text).searchParams
      : new URLSearchParams(text.replace(/^[?#]/, ""));
  } catch {
    return { ok: false, reason: "malformed" };
  }

  const state = params.get("state");
  if (!state || !constantTimeEqual(state, expectedState)) {
    return { ok: false, reason: "state_mismatch" };
  }
  const error = params.get("error");
  if (error === "access_denied") return { ok: false, reason: "denied" };
  if (error) return { ok: false, reason: "oauth_error" };
  const code = params.get("code");
  if (!code) return { ok: false, reason: "missing_code" };

  return {
    ok: true,
    code,
    clientId: params.get("client_id")?.trim() ? params.get("client_id")!.trim() : null,
    scope: (params.get("scope") ?? "").split(/\s+/).filter(Boolean)
  };
}

export function callbackFailureMessage(reason: CallbackFailureReason): string {
  switch (reason) {
    case "denied":
      return "Sign-in was declined. Plan usage must be allowed to connect.";
    case "state_mismatch":
      return "That address does not belong to this sign-in attempt. Start again and paste the new address.";
    case "missing_code":
      return "The address has no sign-in code. Copy the whole address from the browser after signing in.";
    case "oauth_error":
      return "OpenAI returned an error for this sign-in. Start again.";
    case "malformed":
      return "Paste the full address from the browser address bar.";
  }
}

export function hasDirectPlanScope(scopes: readonly string[]): boolean {
  return scopes.includes(CHATGPT_PLAN_DIRECT_SCOPE);
}

export function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  const part = jwt.split(".")[1];
  if (!part) return null;
  try {
    const padded = part.replaceAll("-", "+").replaceAll("_", "/");
    const json = new TextDecoder().decode(Uint8Array.from(atob(padded), (c) => c.charCodeAt(0)));
    const parsed: unknown = JSON.parse(json);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Plan label if the (already verified) ID token carries one; null otherwise. */
export function planTypeFromIdToken(claims: Record<string, unknown>): string | null {
  const auth = claims["https://api.openai.com/auth"];
  if (auth && typeof auth === "object") {
    const plan = (auth as Record<string, unknown>).chatgpt_plan_type;
    if (typeof plan === "string" && plan.length > 0) return plan;
  }
  return null;
}

export function chatgptPlanModelId(slug: string): string {
  return `${CHATGPT_PLAN_PROVIDER_KIND}/${slug}`;
}

export function chatgptPlanSlugFromModelId(modelId: string): string {
  const prefix = `${CHATGPT_PLAN_PROVIDER_KIND}/`;
  return modelId.startsWith(prefix) ? modelId.slice(prefix.length) : modelId;
}

const MESSAGES: Record<ChatgptPlanErrorCode, string> = {
  CHATGPT_PLAN_LIMIT:
    "ChatGPT plan limit reached. The five-hour limit is shared with ChatGPT and every app using your plan. Try again later.",
  CHATGPT_PLAN_RECONNECT:
    "ChatGPT sign-in expired or was revoked. Reconnect ChatGPT in Settings, AI.",
  CHATGPT_PLAN_NOT_ELIGIBLE: "This ChatGPT account cannot use plan usage in apps.",
  CHATGPT_PLAN_UNAVAILABLE: "ChatGPT plan usage is temporarily unavailable. Try again shortly.",
  CHATGPT_PLAN_UNSUPPORTED:
    "ChatGPT plan usage does not support something this request needs. Pick another model or provider."
};

export function chatgptPlanError(code: ChatgptPlanErrorCode): ChatgptPlanError {
  return new ChatgptPlanError(code, MESSAGES[code]);
}

const PLAN_CODE_TO_ERROR: Record<string, ChatgptPlanErrorCode> = {
  subscription_sharing_usage_limit_exceeded: "CHATGPT_PLAN_LIMIT",
  subscription_sharing_user_not_eligible: "CHATGPT_PLAN_NOT_ELIGIBLE",
  subscription_sharing_usage_unavailable: "CHATGPT_PLAN_UNAVAILABLE",
  subscription_sharing_user_unavailable: "CHATGPT_PLAN_UNAVAILABLE",
  subscription_sharing_unsupported_capability: "CHATGPT_PLAN_UNSUPPORTED",
  subscription_sharing_route_not_supported: "CHATGPT_PLAN_UNSUPPORTED"
};

/** Maps a failed Responses call to a typed error; null means not a plan-specific failure. */
export function mapResponsesFailure(input: {
  status: number;
  code?: string | null;
}): ChatgptPlanError | null {
  const byCode = input.code ? PLAN_CODE_TO_ERROR[input.code] : undefined;
  if (byCode) return chatgptPlanError(byCode);
  if (input.status === 401) return chatgptPlanError("CHATGPT_PLAN_RECONNECT");
  if (input.status === 503) return chatgptPlanError("CHATGPT_PLAN_UNAVAILABLE");
  if (input.status === 403) return chatgptPlanError("CHATGPT_PLAN_NOT_ELIGIBLE");
  return null;
}

export function extractChatgptPlanErrorCode(text: string): ChatgptPlanErrorCode | null {
  const match = /\[(CHATGPT_PLAN_[A-Z_]+)\]/.exec(text);
  const code = match?.[1];
  return code && code in MESSAGES ? (code as ChatgptPlanErrorCode) : null;
}
