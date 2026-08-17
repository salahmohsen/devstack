import { describe, expect, it } from "vitest";

import { formatReasoningDuration, parseReasoningSteps } from "./parse-reasoning-steps";

describe("parseReasoningSteps", () => {
  it("splits a spoken blob into title and body on the first sentence", () => {
    expect(
      parseReasoningSteps([
        "User wants to know their job goals / search brief. I should get the search brief to answer this. Let me call getSearchBrief."
      ])
    ).toEqual([
      {
        title: "User wants to know their job goals / search brief.",
        body: "I should get the search brief to answer this. Let me call getSearchBrief."
      }
    ]);
  });

  it("reads markdown headings and blank-line blocks as separate steps", () => {
    expect(
      parseReasoningSteps([
        "## Reading the request\n\nThe user wants drafts restored per thread.\n\n## Locating the seam\n\nDraft state already flows through the runtime."
      ])
    ).toEqual([
      { title: "Reading the request", body: "The user wants drafts restored per thread." },
      { title: "Locating the seam", body: "Draft state already flows through the runtime." }
    ]);
  });

  it("keeps a single clause as a title-only step", () => {
    expect(parseReasoningSteps(["Let me pull the brief."])).toEqual([
      { title: "Let me pull the brief.", body: "" }
    ]);
  });
});

describe("formatReasoningDuration", () => {
  it("formats seconds and mixed minutes", () => {
    expect(formatReasoningDuration(5)).toBe("5s");
    expect(formatReasoningDuration(60)).toBe("1m");
    expect(formatReasoningDuration(75)).toBe("1m 15s");
  });
});
