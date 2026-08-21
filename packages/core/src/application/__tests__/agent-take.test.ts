import { describe, expect, it } from "vitest";

import { normalizeAgentTakeText } from "#@/application/agent-take";

describe("normalizeAgentTakeText", () => {
  it("keeps at most five markdown bullets", () => {
    const text = ["- a", "- b", "- c", "- d", "- e", "- f"].join("\n");
    expect(normalizeAgentTakeText(text)).toBe("- a\n- b\n- c\n- d\n- e");
  });

  it("wraps a paragraph as one bullet", () => {
    expect(normalizeAgentTakeText("Strong Go fit. Remote EU.")).toBe("- Strong Go fit. Remote EU.");
  });

  it("strips em dashes and does not flatten a list to sentences", () => {
    const text = "- Asks 8 years, you have 3\n- Skills overlap is React";
    expect(normalizeAgentTakeText(text)).toBe(
      "- Asks 8 years, you have 3\n- Skills overlap is React"
    );
    expect(normalizeAgentTakeText("Fit is thin — skip unless you want stretch.")).toBe(
      "- Fit is thin, skip unless you want stretch."
    );
  });

  it("drops trailing complete bullets instead of slicing mid-bullet", () => {
    const long = "x".repeat(1180);
    const text = `- ${long}\n- second point that would overflow`;
    const out = normalizeAgentTakeText(text);
    expect(out.startsWith(`- ${long}`)).toBe(true);
    expect(out.includes("second point")).toBe(false);
    expect(out.includes(long.slice(0, 50))).toBe(true);
  });
});
