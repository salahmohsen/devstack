import { describe, expect, it } from "vitest";

import { searchBriefUserTurnNeedsSpokenAnswer } from "#@/job-preference/search-brief-follow-up";

describe("searchBriefUserTurnNeedsSpokenAnswer", () => {
  it.each([
    ["where is the intro?", true],
    ["where's the intro?", true],
    ["what happened to the who paragraph?", true],
    ["where did the skills section go?", true],
    ["what changed in the intro?", true],
    ["why is the opening missing?", true],
    ["what am I looking for?", false],
    ["show my brief", false],
    ["see my search brief", false],
    ["what are my job rules?", false],
    ["what jobs should I take?", false],
    ["who am I?", false],
    ["where are my skills?", false],
    ["", false],
    ["   ", false]
  ] as const)("%j → %s", (text, expected) => {
    expect(searchBriefUserTurnNeedsSpokenAnswer(text)).toBe(expected);
  });
});
