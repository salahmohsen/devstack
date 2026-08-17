import { describe, expect, it } from "vitest";

import { hubFollowupPrompts } from "./hub-follow-up-prompts";

describe("hubFollowupPrompts", () => {
  it("returns nothing on an empty thread", () => {
    expect(hubFollowupPrompts([])).toEqual([]);
  });

  it("offers application / pile / mail after a Today ask", () => {
    expect(
      hubFollowupPrompts([
        { role: "user", parts: [{ type: "text", text: "what's up" }] },
        {
          role: "assistant",
          parts: [
            {
              type: "tool-get-daily-brief",
              toolName: "getDailyBrief",
              state: "output-available"
            }
          ]
        }
      ])
    ).toEqual([
      "What's the latest on my applications?",
      "Anything new in the pile?",
      "Any mail that matters?"
    ]);
  });

  it("offers today and pile after a search-brief turn", () => {
    expect(
      hubFollowupPrompts([
        { role: "user", parts: [{ type: "text", text: "what am I looking for?" }] },
        {
          role: "assistant",
          parts: [
            {
              type: "tool-get-search-brief",
              toolName: "getSearchBrief",
              state: "output-available"
            }
          ]
        }
      ])
    ).toEqual(["What do you have today?", "Anything new in the pile?"]);
  });
});
