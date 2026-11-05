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
    expect(seen.body).toMatchObject({
      model: "gpt-x",
      store: false,
      stream: true,
      include: ["reasoning.encrypted_content"]
    });
    expect(seen.body).not.toHaveProperty("temperature");
    expect(seen.body).not.toHaveProperty("max_output_tokens");
    expect(JSON.stringify(seen.body?.input)).not.toContain('"role":"system"');
    expect(result.content[0]).toMatchObject({ type: "text", text: "hello" });
  });

  it("keeps completed output items when the terminal event has an empty output array", async () => {
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response(
          sse([
            {
              type: "response.output_item.done",
              output_index: 0,
              item: {
                type: "message",
                id: "msg_1",
                role: "assistant",
                content: [{ type: "output_text", text: '{"items":[]}', annotations: [] }]
              }
            },
            {
              type: "response.completed",
              response: {
                id: "resp_1",
                created_at: 1,
                model: "gpt-x",
                output: [],
                usage: { input_tokens: 10, output_tokens: 5 }
              }
            }
          ]),
          { status: 200 }
        )
    );
    const model = chatgptPlanLanguageModel({
      modelId: "chatgpt-plan/gpt-x",
      accessToken: "test-token"
    });
    const result = await model.doGenerate({
      prompt: [{ role: "user", content: [{ type: "text", text: "rewrite" }] }]
    });
    expect(result.content).toContainEqual(
      expect.objectContaining({
        type: "text",
        text: '{"items":[]}'
      })
    );
    const { RequestContext } = await import("@mastra/core/di");
    const { ApplyPackageProjectRewriteChunkSchema } = await import("@tsu-stack/core");
    const { createApplyPackageAgent } = await import("#@/mastra/agents/apply-package-agent");
    const { raceGenerate } = await import("#@/mastra/workflows/apply-package-workflow/llm-shared");
    const draft = await raceGenerate(
      createApplyPackageAgent(),
      "Return an empty project rewrite chunk.",
      ApplyPackageProjectRewriteChunkSchema,
      model,
      new RequestContext(),
      { maxOutputTokens: 4096, timeoutMs: 1000, stepLabel: "rewrite-projects" }
    );
    expect(draft).toEqual({ items: [] });
  });

  it.each([
    ["generate", false],
    ["stream", false],
    ["generate", true],
    ["stream", true]
  ] as const)(
    "replays stateless history during %s (server continuation: %s)",
    async (mode, continuation) => {
      const seen: { body?: Record<string, unknown> } = {};
      vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
        seen.body = JSON.parse(init.body as string);
        return new Response(
          sse([
            {
              type: "response.completed",
              response: {
                id: "resp_followup",
                created_at: 1,
                model: "gpt-6.1-sol",
                output: [],
                usage: { input_tokens: 1, output_tokens: 0 }
              }
            }
          ]),
          { status: 200 }
        );
      });
      const model = chatgptPlanLanguageModel({
        modelId: "chatgpt-plan/gpt-6.1-sol",
        accessToken: "test-token"
      });
      const options: Parameters<typeof model.doGenerate>[0] = {
        prompt: [
          { role: "user", content: [{ type: "text", text: "first turn" }] },
          {
            role: "assistant",
            content: [
              {
                type: "reasoning",
                text: "legacy reasoning",
                providerOptions: { openai: { itemId: "rs_legacy" } }
              },
              {
                type: "reasoning",
                text: "empty encrypted payload",
                providerOptions: {
                  openai: { itemId: "rs_empty", reasoningEncryptedContent: "" }
                }
              },
              {
                type: "reasoning",
                text: "encrypted reasoning",
                providerOptions: {
                  openai: {
                    itemId: "rs_encrypted",
                    reasoningEncryptedContent: "encrypted-payload"
                  }
                }
              },
              {
                type: "text",
                text: "previous answer",
                providerOptions: { openai: { itemId: "msg_previous" } }
              },
              {
                type: "tool-call",
                toolCallId: "call_lookup",
                toolName: "lookup",
                input: { id: "own-record" },
                providerOptions: { openai: { itemId: "fc_previous" } }
              }
            ]
          },
          {
            role: "tool",
            content: [
              {
                type: "tool-result",
                toolCallId: "call_lookup",
                toolName: "lookup",
                output: { type: "text", value: "lookup result" }
              }
            ]
          },
          { role: "user", content: [{ type: "text", text: "continue" }] }
        ],
        providerOptions: {
          openai: {
            store: true,
            conversation: continuation ? "conv_unstored" : undefined,
            previousResponseId: continuation ? "resp_unstored" : undefined,
            include: ["message.output_text.logprobs"],
            reasoningEffort: "low"
          }
        }
      };
      const original = structuredClone(options);
      if (mode === "generate") {
        await model.doGenerate(options);
      } else {
        const result = await model.doStream(options);
        for await (const _part of result.stream) {
          // Consume the stream to exercise the complete provider path.
        }
      }
      expect(options).toEqual(original);
      const input = seen.body?.input as Array<Record<string, unknown>>;
      expect(input.some((item) => item.type === "item_reference")).toBe(false);
      expect(seen.body).toMatchObject({
        store: false,
        stream: true,
        include: ["message.output_text.logprobs", "reasoning.encrypted_content"],
        reasoning: { effort: "low" }
      });
      expect(seen.body).not.toHaveProperty("conversation");
      expect(seen.body).not.toHaveProperty("previous_response_id");
      expect(JSON.stringify(input)).not.toContain("rs_legacy");
      expect(JSON.stringify(input)).not.toContain("rs_empty");
      expect(input).toContainEqual({
        type: "reasoning",
        id: "rs_encrypted",
        encrypted_content: "encrypted-payload",
        summary: [{ type: "summary_text", text: "encrypted reasoning" }]
      });
      expect(input).toContainEqual(
        expect.objectContaining({
          role: "assistant",
          content: [{ type: "output_text", text: "previous answer" }]
        })
      );
      expect(input).toContainEqual(
        expect.objectContaining({
          type: "function_call",
          call_id: "call_lookup",
          name: "lookup",
          arguments: '{"id":"own-record"}'
        })
      );
      expect(input).toContainEqual(
        expect.objectContaining({
          type: "function_call_output",
          call_id: "call_lookup",
          output: "lookup result"
        })
      );
    }
  );

  it("restores completed output in output-index order rather than arrival order", async () => {
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response(
          sse([
            ...[1, 0].map((index) => {
              return {
                type: "response.output_item.done",
                output_index: index,
                item: {
                  type: "message",
                  id: `msg_${index}`,
                  role: "assistant",
                  content: [{ type: "output_text", text: String(index), annotations: [] }]
                }
              };
            }),
            {
              type: "response.completed",
              response: {
                id: "resp_1",
                created_at: 1,
                model: "gpt-x",
                output: [],
                usage: { input_tokens: 1, output_tokens: 2 }
              }
            }
          ]),
          { status: 200 }
        )
    );
    const model = chatgptPlanLanguageModel({
      modelId: "chatgpt-plan/gpt-x",
      accessToken: "test-token"
    });
    const result = await model.doGenerate({
      prompt: [{ role: "user", content: [{ type: "text", text: "hello" }] }]
    });
    expect(result.content).toMatchObject([
      { type: "text", text: "0" },
      { type: "text", text: "1" }
    ]);
  });
});
