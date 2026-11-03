import { afterEach, describe, expect, it, vi } from "vitest";

const recordError = vi.fn().mockResolvedValue(undefined);

vi.mock("@tsu-stack/db", () => {
  return {
    createDb: () => {
      return {};
    },
    runWithDb: (_db: unknown, fn: () => unknown) => fn(),
    userChatgptPlanRepository: { recordError }
  };
});

const { createChatgptPlanFetch, chatgptPlanLanguageModel } =
  await import("#@/mastra/lib/chatgpt-plan-model");

const sse = (events: unknown[]) => events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("");

describe("createChatgptPlanFetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    recordError.mockClear();
  });

  it("forces store/stream, drops rejected fields and renames system to developer", async () => {
    const seen: { body?: Record<string, unknown> } = {};
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      seen.body = JSON.parse(init.body as string);
      return new Response(sse([{ type: "response.completed", response: { id: "r1" } }]), {
        status: 200
      });
    });
    const f = createChatgptPlanFetch("u1");
    const res = await f("https://api.openai.com/v1/responses", {
      method: "POST",
      body: JSON.stringify({
        model: "m",
        temperature: 0.2,
        max_output_tokens: 10,
        store: true,
        input: [{ role: "system", content: "x" }]
      })
    });
    expect(seen.body).toMatchObject({ store: false, stream: true });
    expect(seen.body).not.toHaveProperty("temperature");
    expect(seen.body).not.toHaveProperty("max_output_tokens");
    expect((seen.body?.input as Array<{ role: string }>)[0]?.role).toBe("developer");
    expect(await res.json()).toEqual({ id: "r1" });
  });

  it("returns the stream untouched when the caller asked for streaming", async () => {
    const payload = sse([{ type: "response.completed", response: { id: "r2" } }]);
    vi.stubGlobal("fetch", async () => new Response(payload, { status: 200 }));
    const f = createChatgptPlanFetch("u1");
    const res = await f("https://x", { method: "POST", body: JSON.stringify({ stream: true }) });
    expect(await res.text()).toBe(payload);
  });

  it("throws a typed limit error on HTTP 429 and records it", async () => {
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response(
          JSON.stringify({ error: { code: "subscription_sharing_usage_limit_exceeded" } }),
          { status: 429 }
        )
    );
    const f = createChatgptPlanFetch("u1");
    await expect(
      f("https://x", { method: "POST", body: JSON.stringify({ stream: true }) })
    ).rejects.toMatchObject({ code: "CHATGPT_PLAN_LIMIT" });
    expect(recordError).toHaveBeenCalledWith("u1", "CHATGPT_PLAN_LIMIT");
  });

  it("maps response.failed in a collapsed stream to the typed limit error", async () => {
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response(
          sse([
            {
              type: "response.failed",
              response: { error: { code: "subscription_sharing_usage_limit_exceeded" } }
            }
          ]),
          { status: 200 }
        )
    );
    const f = createChatgptPlanFetch("u1");
    await expect(
      f("https://x", { method: "POST", body: JSON.stringify({ stream: false }) })
    ).rejects.toMatchObject({ code: "CHATGPT_PLAN_LIMIT" });
  });

  it("maps a 401 to reconnect", async () => {
    vi.stubGlobal(
      "fetch",
      async () => new Response(JSON.stringify({ detail: "no" }), { status: 401 })
    );
    const f = createChatgptPlanFetch(undefined);
    await expect(
      f("https://x", { method: "POST", body: JSON.stringify({ stream: true }) })
    ).rejects.toMatchObject({ code: "CHATGPT_PLAN_RECONNECT" });
  });

  it("drives an AI SDK responses model end to end against the stream-only endpoint", async () => {
    const seen: { url?: string; auth?: string; body?: Record<string, unknown> } = {};
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      seen.url = url;
      seen.auth = new Headers(init.headers).get("authorization") ?? undefined;
      seen.body = JSON.parse(init.body as string);
      return new Response(
        sse([
          {
            type: "response.completed",
            response: {
              id: "resp_1",
              created_at: 1,
              model: "gpt-x",
              output: [
                {
                  type: "message",
                  id: "msg_1",
                  role: "assistant",
                  content: [{ type: "output_text", text: "hello", annotations: [] }]
                }
              ],
              usage: { input_tokens: 1, output_tokens: 1 }
            }
          }
        ]),
        { status: 200 }
      );
    });
    const model = chatgptPlanLanguageModel({
      modelId: "chatgpt-plan/gpt-x",
      accessToken: "tok",
      userId: "u1"
    });
    const result = await model.doGenerate({
      prompt: [
        { role: "system", content: "be brief" },
        { role: "user", content: [{ type: "text", text: "hi" }] }
      ],
      temperature: 0.3,
      maxOutputTokens: 20
    });
    expect(seen.url).toBe("https://api.openai.com/v1/responses");
    expect(seen.auth).toBe("Bearer tok");
    expect(seen.body).toMatchObject({ model: "gpt-x", store: false, stream: true });
    expect(seen.body).not.toHaveProperty("temperature");
    expect(seen.body).not.toHaveProperty("max_output_tokens");
    expect(JSON.stringify(seen.body?.input)).not.toContain('"role":"system"');
    expect(result.content[0]).toMatchObject({ type: "text", text: "hello" });
  });
});
