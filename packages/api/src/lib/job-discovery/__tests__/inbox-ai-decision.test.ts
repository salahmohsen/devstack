import { describe, expect, it } from "vitest";

import { decideInboxAiKeep } from "#@/lib/job-discovery/inbox-ai";

describe("decideInboxAiKeep", () => {
  it("dismisses only an AI fail under minMatchScore", () => {
    expect(decideInboxAiKeep({ passed: false, source: "ai" })).toBe("dismissed");
  });

  it("keeps an AI pass", () => {
    expect(decideInboxAiKeep({ passed: true, source: "ai" })).toBe("passed");
  });

  it("does not dismiss when the scorer fell back to heuristic", () => {
    expect(decideInboxAiKeep({ passed: false, source: "heuristic" })).toBe("heuristic");
    expect(decideInboxAiKeep({ passed: true, source: "heuristic" })).toBe("heuristic");
  });
});
