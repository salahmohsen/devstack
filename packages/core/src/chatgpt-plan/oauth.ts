import {
  CHATGPT_PLAN_REFRESH_SKEW_MS,
  CHATGPT_PLAN_RESOURCE,
  CHATGPT_PLAN_REDIRECT_URI,
  CHATGPT_PLAN_TERMINAL_REFRESH_ERRORS,
  CHATGPT_PLAN_TOKEN_URL
} from "./constants";
import { ChatgptPlanError, type ChatgptPlanCredentials } from "./types";
import { chatgptPlanError, hasDirectPlanScope } from "./utils";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

type TokenResponse = {
  access_token?: unknown;
  refresh_token?: unknown;
  id_token?: unknown;
  expires_in?: unknown;
  scope?: unknown;
  earliest_refresh_at?: unknown;
  error?: unknown;
};

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function parseEarliestRefreshAt(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v < 1e12 ? v * 1000 : v;
  if (typeof v === "string") {
    const ms = Date.parse(v);
    return Number.isNaN(ms) ? null : ms;
  }
  return null;
}

async function postTokenForm(
  fetchFn: FetchLike,
  body: Record<string, string>,
  tokenUrl: string
): Promise<{ status: number; json: TokenResponse }> {
  const response = await fetchFn(tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams(body).toString(),
    signal: AbortSignal.timeout(15_000)
  });
  const json = (await response.json().catch(() => {
    return {};
  })) as TokenResponse;
  return { status: response.status, json };
}

function toCredentials(
  json: TokenResponse,
  fallback: Pick<ChatgptPlanCredentials, "clientId" | "idToken" | "scopes" | "refreshToken">,
  now: number
): ChatgptPlanCredentials | null {
  const accessToken = str(json.access_token);
  const refreshToken = str(json.refresh_token) ?? fallback.refreshToken;
  if (!accessToken || !refreshToken) return null;
  const expiresIn = typeof json.expires_in === "number" ? json.expires_in : 3600;
  const scope = str(json.scope);
  return {
    clientId: fallback.clientId,
    accessToken,
    refreshToken,
    idToken: str(json.id_token) ?? fallback.idToken,
    accessExpiresAt: now + expiresIn * 1000,
    earliestRefreshAt: parseEarliestRefreshAt(json.earliest_refresh_at),
    scopes: scope ? scope.split(/\s+/).filter(Boolean) : fallback.scopes
  };
}

export async function exchangeAuthorizationCode(args: {
  fetch: FetchLike;
  clientId: string;
  code: string;
  codeVerifier: string;
  tokenUrl?: string;
  now?: number;
}): Promise<ChatgptPlanCredentials> {
  const { json, status } = await postTokenForm(
    args.fetch,
    {
      grant_type: "authorization_code",
      client_id: args.clientId,
      code: args.code,
      code_verifier: args.codeVerifier,
      redirect_uri: CHATGPT_PLAN_REDIRECT_URI,
      resource: CHATGPT_PLAN_RESOURCE
    },
    args.tokenUrl ?? CHATGPT_PLAN_TOKEN_URL
  );
  if (status >= 500) throw chatgptPlanError("CHATGPT_PLAN_UNAVAILABLE");
  const creds = toCredentials(
    json,
    { clientId: args.clientId, idToken: null, scopes: [], refreshToken: "" },
    args.now ?? Date.now()
  );
  if (status !== 200 || !creds) throw chatgptPlanError("CHATGPT_PLAN_RECONNECT");
  return creds;
}

export async function refreshCredentials(args: {
  fetch: FetchLike;
  current: ChatgptPlanCredentials;
  tokenUrl?: string;
  now?: number;
}): Promise<ChatgptPlanCredentials> {
  let result: Awaited<ReturnType<typeof postTokenForm>>;
  try {
    result = await postTokenForm(
      args.fetch,
      {
        grant_type: "refresh_token",
        client_id: args.current.clientId,
        refresh_token: args.current.refreshToken,
        resource: CHATGPT_PLAN_RESOURCE
      },
      args.tokenUrl ?? CHATGPT_PLAN_TOKEN_URL
    );
  } catch {
    throw chatgptPlanError("CHATGPT_PLAN_UNAVAILABLE");
  }
  const { json, status } = result;
  if (status >= 500) throw chatgptPlanError("CHATGPT_PLAN_UNAVAILABLE");
  const errorCode = str(json.error);
  if (status !== 200 || errorCode) {
    if (errorCode && CHATGPT_PLAN_TERMINAL_REFRESH_ERRORS.has(errorCode)) {
      throw chatgptPlanError("CHATGPT_PLAN_RECONNECT");
    }
    throw chatgptPlanError("CHATGPT_PLAN_UNAVAILABLE");
  }
  const next = toCredentials(json, args.current, args.now ?? Date.now());
  if (!next) throw chatgptPlanError("CHATGPT_PLAN_UNAVAILABLE");
  return next;
}

/**
 * Persistence port. `withUserLock` must serialize concurrent callers for one user
 * across processes (rotating refresh tokens must never race).
 */
export type ChatgptPlanTokenStore = {
  read(userId: string): Promise<ChatgptPlanCredentials | null>;
  withUserLock<T>(
    userId: string,
    fn: (ctx: {
      current: ChatgptPlanCredentials | null;
      save: (next: ChatgptPlanCredentials) => Promise<void>;
      markNeedsReconnect: () => Promise<void>;
    }) => Promise<T>
  ): Promise<T>;
};

function isFresh(c: ChatgptPlanCredentials, now: number): boolean {
  return c.accessExpiresAt - CHATGPT_PLAN_REFRESH_SKEW_MS > now;
}

/** Returns a usable access token, refreshing under the per-user lock when near expiry. */
export async function getFreshAccessToken(args: {
  userId: string;
  store: ChatgptPlanTokenStore;
  fetch: FetchLike;
  tokenUrl?: string;
  now?: () => number;
}): Promise<string> {
  const now = args.now ?? Date.now;

  const quick = await args.store.read(args.userId);
  if (quick && hasDirectPlanScope(quick.scopes) && isFresh(quick, now())) {
    return quick.accessToken;
  }

  return args.store.withUserLock(args.userId, async ({ current, save, markNeedsReconnect }) => {
    if (!current || !hasDirectPlanScope(current.scopes)) {
      throw chatgptPlanError("CHATGPT_PLAN_RECONNECT");
    }
    if (isFresh(current, now())) return current.accessToken;
    if (
      current.earliestRefreshAt &&
      current.earliestRefreshAt > now() &&
      current.accessExpiresAt > now()
    ) {
      return current.accessToken;
    }

    try {
      const next = await refreshCredentials({
        fetch: args.fetch,
        current,
        tokenUrl: args.tokenUrl,
        now: now()
      });
      await save(next);
      return next.accessToken;
    } catch (error) {
      if (error instanceof ChatgptPlanError && error.code === "CHATGPT_PLAN_RECONNECT") {
        await markNeedsReconnect();
        throw error;
      }
      if (current.accessExpiresAt > now()) return current.accessToken;
      throw error;
    }
  });
}
