import { createServer, type Server } from "node:http";
import { type AddressInfo } from "node:net";

import { afterEach, describe, expect, it } from "vitest";

import { CHATGPT_PLAN_REDIRECT_URI, CHATGPT_PLAN_SCOPES } from "#@/chatgpt-plan/constants";
import {
  exchangeAuthorizationCode,
  getFreshAccessToken,
  type ChatgptPlanTokenStore
} from "#@/chatgpt-plan/oauth";
import { type ChatgptPlanCredentials } from "#@/chatgpt-plan/types";
import {
  buildAuthorizeUrl,
  extractChatgptPlanErrorCode,
  mapResponsesFailure,
  parseCallbackInput,
  pkceChallengeS256
} from "#@/chatgpt-plan/utils";

describe("pkceChallengeS256", () => {
  it("matches the RFC 7636 appendix B vector", async () => {
    expect(await pkceChallengeS256("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe(
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
    );
  });
});

describe("buildAuthorizeUrl", () => {
  const base = { hostId: "urn:uuid:test", state: "s", nonce: "n", codeChallenge: "c" };

  it("registers dynamically on first sign-in", () => {
    const p = new URL(buildAuthorizeUrl(base)).searchParams;
    expect(p.get("client_id")).toBe("dynamic_agent_client");
    expect(p.get("agent_name_hint")).toBe("tsu-stack");
    expect(p.get("ext_agent_host_id")).toBe("urn:uuid:test");
    expect(p.get("redirect_uri")).toBe(CHATGPT_PLAN_REDIRECT_URI);
    expect(p.get("redirect_uri")).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/auth\/callback$/);
    expect(p.get("scope")?.split(" ")).toEqual([...CHATGPT_PLAN_SCOPES]);
    expect(p.get("resource")).toBe("https://api.openai.com/v1");
    expect(p.get("code_challenge_method")).toBe("S256");
    expect(p.get("response_type")).toBe("code");
  });

  it("reuses the issued client id and omits the name hint", () => {
    const p = new URL(buildAuthorizeUrl({ ...base, clientId: "oaiapp_abc", idTokenHint: "idt" }))
      .searchParams;
    expect(p.get("client_id")).toBe("oaiapp_abc");
    expect(p.has("agent_name_hint")).toBe(false);
    expect(p.get("id_token_hint")).toBe("idt");
  });
});

describe("parseCallbackInput", () => {
  const url = (q: string) => `http://127.0.0.1:41455/auth/callback?${q}`;

  it("parses code and issued client id from the full URL", () => {
    const r = parseCallbackInput(url("code=abc&state=st&client_id=oaiapp_1&scope=a+b"), "st");
    expect(r).toEqual({ ok: true, code: "abc", clientId: "oaiapp_1", scope: ["a", "b"] });
  });

  it("rejects a wrong or missing state", () => {
    expect(parseCallbackInput(url("code=abc&state=zz"), "st")).toEqual({
      ok: false,
      reason: "state_mismatch"
    });
    expect(parseCallbackInput(url("code=abc"), "st")).toEqual({
      ok: false,
      reason: "state_mismatch"
    });
  });

  it("rejects a bare code because state cannot be checked", () => {
    expect(parseCallbackInput("abc", "st")).toEqual({ ok: false, reason: "state_mismatch" });
  });

  it("reports access_denied only after state matches", () => {
    expect(parseCallbackInput(url("error=access_denied&state=st"), "st")).toEqual({
      ok: false,
      reason: "denied"
    });
    expect(parseCallbackInput(url("error=access_denied&state=bad"), "st")).toEqual({
      ok: false,
      reason: "state_mismatch"
    });
  });

  it("accepts a bare query string", () => {
    expect(parseCallbackInput("?code=abc&state=st", "st")).toMatchObject({ ok: true, code: "abc" });
  });
});

describe("mapResponsesFailure", () => {
  it("maps the usage limit code", () => {
    const e = mapResponsesFailure({
      status: 429,
      code: "subscription_sharing_usage_limit_exceeded"
    });
    expect(e?.code).toBe("CHATGPT_PLAN_LIMIT");
    expect(extractChatgptPlanErrorCode(e?.message ?? "")).toBe("CHATGPT_PLAN_LIMIT");
  });

  it("maps 401 to reconnect and unrelated failures to null", () => {
    expect(mapResponsesFailure({ status: 401 })?.code).toBe("CHATGPT_PLAN_RECONNECT");
    expect(mapResponsesFailure({ status: 500 })).toBeNull();
    expect(mapResponsesFailure({ status: 429, code: "rate_limit_exceeded" })).toBeNull();
  });
});

describe("token endpoint", () => {
  let server: Server | null = null;
  const requests: URLSearchParams[] = [];
  let respond: (form: URLSearchParams) => { status: number; body: unknown } = () => {
    return {
      status: 200,
      body: {}
    };
  };

  async function start(): Promise<string> {
    server = createServer((req, res) => {
      let data = "";
      req.on("data", (c) => (data += c));
      req.on("end", () => {
        const form = new URLSearchParams(data);
        requests.push(form);
        const { status, body } = respond(form);
        res.writeHead(status, { "content-type": "application/json" });
        res.end(JSON.stringify(body));
      });
    });
    await new Promise<void>((r) => server!.listen(0, "127.0.0.1", r));
    return `http://127.0.0.1:${(server.address() as AddressInfo).port}/token`;
  }

  afterEach(async () => {
    requests.length = 0;
    await new Promise<void>((r) => (server ? server.close(() => r()) : r()));
    server = null;
  });

  const scopes = ["openid", "offline_access", "chatgpt.tokens.use.direct"];
  const creds = (over: Partial<ChatgptPlanCredentials> = {}): ChatgptPlanCredentials => {
    return {
      clientId: "oaiapp_1",
      accessToken: "at-old",
      refreshToken: "rt-old",
      idToken: "idt",
      accessExpiresAt: 0,
      earliestRefreshAt: null,
      scopes,
      ...over
    };
  };

  it("exchanges a code with the verifier, redirect uri and resource", async () => {
    const tokenUrl = await start();
    respond = () => {
      return {
        status: 200,
        body: {
          access_token: "at",
          refresh_token: "rt",
          id_token: "idt",
          expires_in: 3600,
          scope: scopes.join(" ")
        }
      };
    };
    const out = await exchangeAuthorizationCode({
      fetch,
      tokenUrl,
      clientId: "oaiapp_1",
      code: "the-code",
      codeVerifier: "ver",
      now: 1_000
    });
    const form = requests[0]!;
    expect(form.get("grant_type")).toBe("authorization_code");
    expect(form.get("code_verifier")).toBe("ver");
    expect(form.get("redirect_uri")).toBe(CHATGPT_PLAN_REDIRECT_URI);
    expect(form.get("resource")).toBe("https://api.openai.com/v1");
    expect(form.has("client_secret")).toBe(false);
    expect(out).toMatchObject({
      accessToken: "at",
      refreshToken: "rt",
      accessExpiresAt: 3_601_000
    });
  });

  function memoryStore(initial: ChatgptPlanCredentials): {
    store: ChatgptPlanTokenStore;
    state: { creds: ChatgptPlanCredentials; reconnect: boolean };
  } {
    const state = { creds: initial, reconnect: false };
    let tail: Promise<unknown> = Promise.resolve();
    const store: ChatgptPlanTokenStore = {
      read: async () => state.creds,
      withUserLock: (_userId, fn) => {
        const run = tail.then(() =>
          fn({
            current: state.creds,
            save: async (next) => {
              state.creds = next;
            },
            markNeedsReconnect: async () => {
              state.reconnect = true;
            }
          })
        );
        tail = run.catch(() => undefined);
        return run;
      }
    };
    return { store, state };
  }

  it("refreshes once for concurrent callers and keeps the rotated token", async () => {
    const tokenUrl = await start();
    let n = 0;
    respond = (form) => {
      n += 1;
      expect(form.get("grant_type")).toBe("refresh_token");
      expect(form.get("client_id")).toBe("oaiapp_1");
      expect(form.get("resource")).toBe("https://api.openai.com/v1");
      expect(form.has("scope")).toBe(false);
      return {
        status: 200,
        body: { access_token: `at-${n}`, refresh_token: `rt-${n}`, expires_in: 3600 }
      };
    };
    const { store, state } = memoryStore(creds());
    const tokens = await Promise.all(
      [1, 2, 3, 4].map(() => getFreshAccessToken({ userId: "u", store, fetch, tokenUrl }))
    );
    expect(requests).toHaveLength(1);
    expect(new Set(tokens)).toEqual(new Set(["at-1"]));
    expect(state.creds.refreshToken).toBe("rt-1");
    expect(state.creds.idToken).toBe("idt");
  });

  it("flags reconnect when the refresh token is rejected", async () => {
    const tokenUrl = await start();
    respond = () => {
      return { status: 400, body: { error: "refresh_token_reused" } };
    };
    const { store, state } = memoryStore(creds());
    await expect(
      getFreshAccessToken({ userId: "u", store, fetch, tokenUrl })
    ).rejects.toMatchObject({
      code: "CHATGPT_PLAN_RECONNECT"
    });
    expect(state.reconnect).toBe(true);
  });

  it("keeps credentials and a still-valid token on a transient failure", async () => {
    const tokenUrl = await start();
    respond = () => {
      return { status: 503, body: {} };
    };
    const now = 10_000_000;
    const { store, state } = memoryStore(creds({ accessExpiresAt: now + 60_000 }));
    const token = await getFreshAccessToken({
      userId: "u",
      store,
      fetch,
      tokenUrl,
      now: () => now
    });
    expect(token).toBe("at-old");
    expect(state.reconnect).toBe(false);
  });

  it("requires reconnect when the grant lacks the direct plan scope", async () => {
    const { store } = memoryStore(
      creds({ scopes: ["openid"], accessExpiresAt: Date.now() + 3_600_000 })
    );
    await expect(getFreshAccessToken({ userId: "u", store, fetch })).rejects.toMatchObject({
      code: "CHATGPT_PLAN_RECONNECT"
    });
  });
});
