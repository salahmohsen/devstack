import { describe, expect, it } from "vitest";

import {
  collapseConsecutiveTextParts,
  filterTextWhileStreaming
} from "./collapse-consecutive-text-parts";

describe("collapseConsecutiveTextParts", () => {
  it("keeps only the latest of consecutive texts", () => {
    const out = collapseConsecutiveTextParts([
      { type: "text", text: "a" },
      { type: "text", text: "b" },
      { type: "text", text: "c" }
    ]);
    expect(out).toEqual([{ type: "text", text: "c" }]);
  });

  it("collapses texts separated only by step-start", () => {
    const out = collapseConsecutiveTextParts([
      { type: "step-start" },
      { type: "text", text: "first" },
      { type: "step-start" },
      { type: "text", text: "second" }
    ]);
    expect(out).toEqual([{ type: "text", text: "second" }]);
  });

  it("preserves text around tools", () => {
    const out = collapseConsecutiveTextParts([
      { type: "text", text: "pre" },
      { type: "tool-x", toolCallId: "1", state: "output-available" },
      { type: "text", text: "final" }
    ]);
    expect(out).toHaveLength(3);
    expect(out[0]?.text).toBe("pre");
    expect(out[2]?.text).toBe("final");
  });

  it("skips empty text", () => {
    const out = collapseConsecutiveTextParts([
      { type: "text", text: "keep" },
      { type: "text", text: "   " },
      { type: "text", text: "next" }
    ]);
    expect(out).toEqual([{ type: "text", text: "next" }]);
  });
});

describe("filterTextWhileStreaming", () => {
  it("keeps all parts when not streaming", () => {
    const parts = [{ type: "text" as const, text: "done", state: "done" as const }];
    expect(filterTextWhileStreaming(parts, false)).toEqual(parts);
  });

  it("hides completed text while stream continues between steps", () => {
    const out = filterTextWhileStreaming([{ type: "text", text: "draft A", state: "done" }], true);
    expect(out).toEqual([]);
  });

  it("keeps actively streaming text", () => {
    const out = filterTextWhileStreaming(
      [
        { type: "text", text: "old", state: "done" },
        { type: "text", text: "new…", state: "streaming" }
      ],
      true
    );
    expect(out).toEqual([{ type: "text", text: "new…", state: "streaming" }]);
  });
});
