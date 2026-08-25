import { describe, expect, it } from "vitest";

import { extractStructuredGeneratePayload } from "./llm-shared";

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
});
