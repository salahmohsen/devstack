import { describe, expect, it } from "vitest";

import { lineDiff, searchBriefChanged } from "./line-diff";

describe("searchBriefChanged", () => {
  it("is false when both sides are missing", () => {
    expect(searchBriefChanged(null, null)).toBe(false);
    expect(searchBriefChanged(undefined, undefined)).toBe(false);
    expect(searchBriefChanged(null, undefined)).toBe(false);
  });

  it("is false when previous and next match", () => {
    expect(searchBriefChanged("# brief", "# brief")).toBe(false);
  });

  it("is true when previousMarkdown differs from markdown", () => {
    expect(searchBriefChanged("# old", "# new")).toBe(true);
    expect(searchBriefChanged(null, "# new")).toBe(true);
    expect(searchBriefChanged("# old", null)).toBe(true);
  });
});

describe("lineDiff", () => {
  it("marks identical lines as context", () => {
    expect(lineDiff("a\nb", "a\nb")).toEqual([
      { id: "1", type: "context", oldLine: 1, newLine: 1, content: "a" },
      { id: "2", type: "context", oldLine: 2, newLine: 2, content: "b" }
    ]);
  });

  it("marks a replacement as removed + added", () => {
    const lines = lineDiff("remote EU", "remote MENA");
    expect(lines).toEqual([
      { id: "1", type: "removed", oldLine: 1, content: "remote EU" },
      { id: "2", type: "added", newLine: 1, content: "remote MENA" }
    ]);
  });

  it("keeps shared lines and diffs the rest", () => {
    const previous = ["# Search brief", "Remote EU", "Frontend"].join("\n");
    const next = ["# Search brief", "Remote MENA", "Frontend"].join("\n");
    expect(lineDiff(previous, next).map((line) => [line.type, line.content])).toEqual([
      ["context", "# Search brief"],
      ["removed", "Remote EU"],
      ["added", "Remote MENA"],
      ["context", "Frontend"]
    ]);
  });

  it("treats an empty previous as all additions", () => {
    expect(lineDiff("", "hello")).toEqual([
      { id: "1", type: "added", newLine: 1, content: "hello" }
    ]);
  });
});
