import { RequestContext } from "@mastra/core/di";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { extractStructuredGeneratePayload, raceGenerate } from "./llm-shared";

describe("extractStructuredGeneratePayload", () => {
  it("prefers result.object when present", () => {
    expect(
      extractStructuredGeneratePayload({
        object: { items: [{ experienceId: "e1", rewrittenBullets: ["x"] }] },
        text: "ignore me"
      })
    ).toEqual({ items: [{ experienceId: "e1", rewrittenBullets: ["x"] }] });
  });

  it("parses bare JSON text when object is missing", () => {
    expect(
      extractStructuredGeneratePayload({
        text: '{"items":[{"experienceId":"e1","rewrittenBullets":["Did X"]}]}'
      })
    ).toEqual({ items: [{ experienceId: "e1", rewrittenBullets: ["Did X"] }] });
  });

  it("parses fenced JSON text", () => {
    expect(
      extractStructuredGeneratePayload({
        text: 'Here you go:\n```json\n{"items":[{"projectId":"p1","rewrittenSummary":"App"}]}\n```\n'
      })
    ).toEqual({ items: [{ projectId: "p1", rewrittenSummary: "App" }] });
  });

  it("parses a leading bare array in text", () => {
    expect(
      extractStructuredGeneratePayload({
        text: 'Sure.\n[{"experienceId":"e1","rewrittenBullets":["A"]}]'
      })
    ).toEqual([{ experienceId: "e1", rewrittenBullets: ["A"] }]);
  });

  it("returns undefined for empty or non-JSON text", () => {
    expect(extractStructuredGeneratePayload({})).toBeUndefined();
    expect(extractStructuredGeneratePayload({ text: "   " })).toBeUndefined();
    expect(extractStructuredGeneratePayload({ text: "I activated the skill." })).toBeUndefined();
  });

  it("parses the first complete JSON value when trailing prose follows", () => {
    expect(
      extractStructuredGeneratePayload({
        text: '{"items":[{"experienceId":"e1","rewrittenBullets":["A"]}]} Here is a short note.'
      })
    ).toEqual({ items: [{ experienceId: "e1", rewrittenBullets: ["A"] }] });
  });
});

describe("raceGenerate cancellation", () => {
  it("aborts the underlying request when the deadline expires", async () => {
    vi.useFakeTimers();
    try {
      let signal: AbortSignal | undefined;
      const agent = {
        generate: vi.fn((_messages, options) => {
          signal = options.abortSignal;
          return new Promise<never>(() => {});
        })
      };
      const pending = raceGenerate(
        agent,
        "rewrite",
        z.object({}),
        {
          id: "openai/test",
          apiKey: "test-token"
        },
        new RequestContext(),
        { maxOutputTokens: 100, timeoutMs: 50, stepLabel: "rewrite" }
      );
      const rejected = expect(pending).rejects.toThrow("rewrite timeout 50ms");
      await vi.advanceTimersByTimeAsync(50);
      await rejected;
      expect(signal?.aborted).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
