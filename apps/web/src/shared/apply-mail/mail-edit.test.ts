import { describe, expect, it } from "vitest";

import { applyMailParagraphEdit } from "./mail-edit";

describe("applyMailParagraphEdit", () => {
  it("replaces the edited paragraph in place", () => {
    expect(applyMailParagraphEdit(["A", "B", "C"], 1, "X")).toEqual(["A", "X", "C"]);
  });

  it("removes a middle paragraph when committed empty, keeping the rest", () => {
    expect(applyMailParagraphEdit(["A", "B", "C"], 1, "")).toEqual(["A", "C"]);
  });

  it("removing the only paragraph yields an empty list", () => {
    expect(applyMailParagraphEdit(["B"], 0, "")).toEqual([]);
  });

  it("removing the first paragraph keeps the remaining order", () => {
    expect(applyMailParagraphEdit(["A", "B", "C"], 0, "")).toEqual(["B", "C"]);
  });
});
