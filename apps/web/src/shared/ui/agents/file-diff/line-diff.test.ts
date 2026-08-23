import { describe, expect, it } from "vitest";

import {
  lineDiff,
  previewFileLines,
  searchBriefChanged,
  shouldRenderSearchBriefFileDiff
} from "./line-diff";

describe("searchBriefChanged", () => {
  it("is false when both sides are missing", () => {
    expect(searchBriefChanged(null, null)).toBe(false);
    expect(searchBriefChanged(undefined, undefined)).toBe(false);
    expect(searchBriefChanged(null, undefined)).toBe(false);
  });

  it("is false when previous and next match", () => {
    expect(searchBriefChanged("# brief", "# brief")).toBe(false);
  });

  it("is false when there is no previous snapshot", () => {
    expect(searchBriefChanged(null, "# new")).toBe(false);
    expect(searchBriefChanged(undefined, "# new")).toBe(false);
  });

  it("is false on a cache hit even if a leftover snapshot differs", () => {
    expect(searchBriefChanged("# old", "# new", false)).toBe(false);
  });

  it("is true when a rebuild has a previous snapshot that differs", () => {
    expect(searchBriefChanged("# old", "# new")).toBe(true);
    expect(searchBriefChanged("# old", "# new", true)).toBe(true);
    expect(searchBriefChanged("# old", null, true)).toBe(true);
  });
});

describe("shouldRenderSearchBriefFileDiff", () => {
  it("is true whenever markdown exists — cache hit and first build included", () => {
    expect(shouldRenderSearchBriefFileDiff("# brief")).toBe(true);
    expect(shouldRenderSearchBriefFileDiff("  rules  ")).toBe(true);
  });

  it("is false when there is nothing to show", () => {
    expect(shouldRenderSearchBriefFileDiff(null)).toBe(false);
    expect(shouldRenderSearchBriefFileDiff(undefined)).toBe(false);
    expect(shouldRenderSearchBriefFileDiff("")).toBe(false);
    expect(shouldRenderSearchBriefFileDiff("   ")).toBe(false);
  });
});

describe("lineDiff", () => {
  it("marks identical lines as context", () => {
    expect(lineDiff("a\nb", "a\nb")).toEqual([
      { id: "1", type: "context", oldLine: 1, newLine: 1, content: "a" },
      { id: "2", type: "context", oldLine: 2, newLine: 2, content: "b" }
    ]);
  });

  it("marks a replacement as removed + added with inline word segments", () => {
    const lines = lineDiff("remote EU", "remote MENA");
    expect(lines.map((line) => [line.type, line.content])).toEqual([
      ["removed", "remote EU"],
      ["added", "remote MENA"]
    ]);
    expect(lines[0]?.segments?.some((segment) => segment.type === "equal")).toBe(true);
    expect(lines[0]?.segments?.some((segment) => segment.type === "removed")).toBe(true);
    expect(lines[1]?.segments?.some((segment) => segment.type === "added")).toBe(true);
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

  it("treats trimmed-equal lines as context", () => {
    expect(lineDiff("hello  ", "hello").map((line) => line.type)).toEqual(["context"]);
  });

  it("treats an empty previous as all additions", () => {
    expect(lineDiff("", "hello")).toEqual([
      { id: "1", type: "added", newLine: 1, content: "hello" }
    ]);
  });
});

describe("previewFileLines", () => {
  it("marks every line as context with no added/removed gutter", () => {
    expect(previewFileLines("a\nb")).toEqual([
      { id: "1", type: "context", newLine: 1, content: "a" },
      { id: "2", type: "context", newLine: 2, content: "b" }
    ]);
  });
});
