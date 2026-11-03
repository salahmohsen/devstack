export const CHATGPT_PLAN_PROVIDER_KIND = "chatgpt-plan";

export const CHATGPT_PLAN_ISSUER = "https://auth.openai.com";
export const CHATGPT_PLAN_AUTHORIZE_URL = `${CHATGPT_PLAN_ISSUER}/api/accounts/authorize`;
export const CHATGPT_PLAN_TOKEN_URL = `${CHATGPT_PLAN_ISSUER}/api/accounts/oauth/token`;
export const CHATGPT_PLAN_DISCOVERY_URL = `${CHATGPT_PLAN_ISSUER}/.well-known/openid-configuration`;

export const CHATGPT_PLAN_RESOURCE = "https://api.openai.com/v1";
export const CHATGPT_PLAN_API_BASE_URL = CHATGPT_PLAN_RESOURCE;

export const CHATGPT_PLAN_DYNAMIC_CLIENT_ID = "dynamic_agent_client";
export const CHATGPT_PLAN_AGENT_NAME_HINT = "tsu-stack";

export const CHATGPT_PLAN_DIRECT_SCOPE = "chatgpt.tokens.use.direct";
export const CHATGPT_PLAN_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "resource.invoke",
  CHATGPT_PLAN_DIRECT_SCOPE
] as const;

/** Loopback on the owner's machine; nothing listens there, the owner copies the address bar. */
export const CHATGPT_PLAN_REDIRECT_URI = "http://127.0.0.1:41455/auth/callback";

export const CHATGPT_PLAN_PENDING_TTL_MS = 10 * 60 * 1000;
export const CHATGPT_PLAN_REFRESH_SKEW_MS = 5 * 60 * 1000;
export const CHATGPT_PLAN_LIMIT_PAUSE_MS = 5 * 60 * 1000;

export const CHATGPT_PLAN_ERROR_CODES = [
  "CHATGPT_PLAN_LIMIT",
  "CHATGPT_PLAN_RECONNECT",
  "CHATGPT_PLAN_NOT_ELIGIBLE",
  "CHATGPT_PLAN_UNAVAILABLE",
  "CHATGPT_PLAN_UNSUPPORTED"
] as const;

/** Refresh-endpoint errors after which the stored tokens are unusable. */
export const CHATGPT_PLAN_TERMINAL_REFRESH_ERRORS: ReadonlySet<string> = new Set([
  "invalid_grant",
  "invalid_refresh_token",
  "token_expired",
  "refresh_token_expired",
  "refresh_token_invalidated",
  "refresh_token_reused"
]);
