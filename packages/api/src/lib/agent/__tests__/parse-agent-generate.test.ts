import { describe, expect, it } from "vitest";

import {
  agentGenerateFinishReason,
  extractTextFromAgentBody
} from "#@/lib/agent/parse-agent-generate";

describe("extractTextFromAgentBody", () => {
  it("reads top-level text", () => {
    expect(extractTextFromAgentBody({ text: "  Hybrid Next.js role.  " })).toBe(
      "Hybrid Next.js role."
    );
  });

  it("reads assistant content parts and skips reasoning", () => {
    expect(
      extractTextFromAgentBody({
        text: "",
        finishReason: "stop",
        messages: [
          {
            role: "assistant",
            content: [
              { type: "reasoning", text: "Let me think about London hybrid." },
              { type: "text", text: "Strong React/Next fit; London hybrid is the gap." }
            ]
          }
        ]
      })
    ).toBe("Strong React/Next fit; London hybrid is the gap.");
  });

  it("reads nested result.text used by some Mastra HTTP wrappers", () => {
    expect(
      extractTextFromAgentBody({
        result: { text: "Senior frontend, London office three days." }
      })
    ).toBe("Senior frontend, London office three days.");
  });

  it("returns null when only reasoning exists", () => {
    expect(
      extractTextFromAgentBody({
        text: "   ",
        reasoningText: "The role is hybrid in London…",
        finishReason: "length"
      })
    ).toBeNull();
  });
});

describe("agentGenerateFinishReason", () => {
  it("reads top-level and nested finishReason", () => {
    expect(agentGenerateFinishReason({ finishReason: "length" })).toBe("length");
    expect(agentGenerateFinishReason({ result: { finishReason: "stop" } })).toBe("stop");
    expect(agentGenerateFinishReason({ text: "hi" })).toBeNull();
  });
});
